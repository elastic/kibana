/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseYamlToJSONWithoutValidation, stringifyWorkflowDefinition } from '@kbn/workflows-yaml';

export const ONLINE_EVAL_WORKFLOW_TAG = 'evals-online';
const ONLINE_EVAL_NAME_PREFIX = '[online-eval] ';

const SAMPLE_TRACES_STEP_NAME = 'sample_traces';
const EVALUATE_EACH_STEP_NAME = 'evaluate_each';
const EVALUATE_STEP_NAME = 'evaluate';
const PERSIST_STEP_NAME = 'persist';

const SAMPLE_TRACES_OUTPUT_VALUES_TEMPLATE = '{{ steps.sample_traces.output.values }}';
const TRACE_ID_TEMPLATE = '{{ foreach.item[1] }}';
const CONNECTOR_ID_TEMPLATE = '{{ consts.connector_id }}';
const WORKFLOW_ID_TEMPLATE = '{{ workflow.id }}';
const WORKFLOW_NAME_TEMPLATE = '{{ workflow.name }}';
// `${{ ... }}` (not `{{ ... }}`) is required here: the workflow templating engine
// stringifies plain `{{ }}` interpolations, which would turn these arrays into strings
// and fail the persist step's input validation.
const EVALUATE_RESULTS_TEMPLATE = '${{ steps.evaluate.output.results }}';
const EVALUATE_ERRORS_TEMPLATE = '${{ steps.evaluate.output.errors }}';

// Keep module-level values plain literals, and don't import the step definitions for these
// ids: either makes the bundler keep this module (and zod) in the plugin's page-load bundle
// through the `common` barrel.
const EVALUATE_TRACE_STEP_TYPE = 'ai.evals.evaluateTrace';
const PERSIST_ONLINE_SCORES_STEP_TYPE = 'ai.evals.persistOnlineScores';

// A fresh object per step: a shared reference would be serialized as a YAML anchor and alias.
const buildStepOnFailure = () => ({
  retry: {
    'max-attempts': 3,
    delay: '5s',
    strategy: 'exponential',
    'max-delay': '1m',
    jitter: true,
  },
});

// A trace whose retries are exhausted is skipped rather than failing the whole run.
const ITERATION_ON_FAILURE = { continue: true };

const WINDOW_AND_LAG_REGEX =
  /\|\s*WHERE\s+@timestamp\s*>=\s*NOW\(\)\s*-\s*(\d+)m\s+AND\s+@timestamp\s*<\s*NOW\(\)\s*-\s*(\d+)m/i;
const LIMIT_REGEX = /\|\s*LIMIT\s+(\d+)/i;
const FROM_REGEX = /^FROM\s+(.+)$/i;
const WHERE_PREFIX_REGEX = /^\|\s*WHERE\s+/i;
// Matches the trace-filter line across all generations of the sample query so
// workflows created by older builds keep parsing (and the line is never
// misread as the user's extra WHERE filter):
// - current: KQL()-based LLM selection + evaluator exclusion
// - interim: bare attributes.* column references (crashed on fresh clusters)
// - v1: evaluator exclusion only
const TRACE_FILTER_REGEX =
  /^\|\s*WHERE\s+parent_span_id\s+IS\s+NULL\s+AND\s+(?:KQL\("attributes\.gen_ai\.operation\.name:\*"\)\s+AND\s+NOT\s+KQL\("attributes\.evaluator\.name:\*"\)|attributes\.evaluator\.name\s+IS\s+NULL(?:\s+AND\s+attributes\.gen_ai\.operation\.name\s+IS\s+NOT\s+NULL)?)$/i;

interface WorkflowStep {
  name: string;
  type: string;
  [key: string]: unknown;
}

export interface OnlineEvalWorkflowEvaluatorConfig {
  name: string;
  version?: string;
}

export interface OnlineEvalWorkflowConfig {
  name: string;
  indexPattern: string;
  extraEsqlWhere?: string;
  windowMinutes: number;
  lagMinutes: number;
  maxTracesPerRun: number;
  every: string;
  evaluators: OnlineEvalWorkflowEvaluatorConfig[];
  connectorId: string;
}

const buildEsqlQuery = ({
  indexPattern,
  extraEsqlWhere,
  windowMinutes,
  lagMinutes,
  maxTracesPerRun,
}: Pick<
  OnlineEvalWorkflowConfig,
  'indexPattern' | 'extraEsqlWhere' | 'windowMinutes' | 'lagMinutes' | 'maxTracesPerRun'
>) => {
  const totalWindowMinutes = windowMinutes + lagMinutes;
  const normalizedExtraWhere = extraEsqlWhere?.trim();
  const queryLines = [
    `FROM ${indexPattern}`,
    `| WHERE @timestamp >= NOW() - ${totalWindowMinutes}m AND @timestamp < NOW() - ${lagMinutes}m`,
    // Dynamic attributes.* columns may be unmapped on fresh clusters and ES|QL
    // rejects unknown columns at compile time; KQL() evaluates at the query
    // layer, where an exists-check on an unmapped field just matches nothing.
    '| WHERE parent_span_id IS NULL AND KQL("attributes.gen_ai.operation.name:*") AND NOT KQL("attributes.evaluator.name:*")',
    ...(normalizedExtraWhere ? [`| WHERE ${normalizedExtraWhere}`] : []),
    '| STATS latest = MAX(@timestamp) BY trace_id',
    '| KEEP latest, trace_id',
    '| SORT latest DESC',
    `| LIMIT ${maxTracesPerRun}`,
  ];

  return queryLines.join('\n');
};

const parseEsqlQuery = (
  query: string
): Pick<
  OnlineEvalWorkflowConfig,
  'indexPattern' | 'extraEsqlWhere' | 'windowMinutes' | 'lagMinutes' | 'maxTracesPerRun'
> | null => {
  const lines = query
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const fromLine = lines.find((line) => FROM_REGEX.test(line));
  const windowAndLagLine = lines.find((line) => WINDOW_AND_LAG_REGEX.test(line));
  const traceFilterLine = lines.find((line) => TRACE_FILTER_REGEX.test(line));
  const limitLine = lines.find((line) => LIMIT_REGEX.test(line));

  if (!fromLine || !windowAndLagLine || !traceFilterLine || !limitLine) {
    return null;
  }

  const fromMatch = fromLine.match(FROM_REGEX);
  const windowAndLagMatch = windowAndLagLine.match(WINDOW_AND_LAG_REGEX);
  const limitMatch = limitLine.match(LIMIT_REGEX);

  if (!fromMatch || !windowAndLagMatch || !limitMatch) {
    return null;
  }

  const totalWindowMinutes = Number(windowAndLagMatch[1]);
  const lagMinutes = Number(windowAndLagMatch[2]);
  const maxTracesPerRun = Number(limitMatch[1]);

  if (
    !Number.isFinite(totalWindowMinutes) ||
    !Number.isFinite(lagMinutes) ||
    totalWindowMinutes < lagMinutes
  ) {
    return null;
  }

  const windowMinutes = totalWindowMinutes - lagMinutes;

  const extraWhereLine = lines.find(
    (line) =>
      WHERE_PREFIX_REGEX.test(line) &&
      !WINDOW_AND_LAG_REGEX.test(line) &&
      !TRACE_FILTER_REGEX.test(line)
  );

  return {
    indexPattern: fromMatch[1].trim(),
    extraEsqlWhere: extraWhereLine
      ? extraWhereLine.replace(WHERE_PREFIX_REGEX, '').trim()
      : undefined,
    windowMinutes,
    lagMinutes,
    maxTracesPerRun,
  };
};

const parseWorkflowName = (name: unknown) => {
  if (typeof name !== 'string') {
    return null;
  }

  if (!name.startsWith(ONLINE_EVAL_NAME_PREFIX)) {
    return null;
  }

  return name.slice(ONLINE_EVAL_NAME_PREFIX.length);
};

const toWorkflowStep = (value: unknown): WorkflowStep | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const step = value as Record<string, unknown>;
  if (typeof step.name !== 'string' || typeof step.type !== 'string') {
    return null;
  }

  return step as WorkflowStep;
};

const getNamedStep = (steps: unknown, expectedName: string): WorkflowStep | null => {
  if (!Array.isArray(steps)) {
    return null;
  }

  const maybeStep = steps.find(
    (step): step is Record<string, unknown> =>
      Boolean(step) &&
      typeof step === 'object' &&
      (step as { name?: unknown }).name === expectedName
  );

  return toWorkflowStep(maybeStep);
};

const getStepWith = (step: WorkflowStep): Record<string, unknown> | null =>
  step.with && typeof step.with === 'object' ? (step.with as Record<string, unknown>) : null;

export const buildOnlineEvalWorkflowYaml = (config: OnlineEvalWorkflowConfig): string => {
  const {
    name,
    indexPattern,
    extraEsqlWhere,
    windowMinutes,
    lagMinutes,
    maxTracesPerRun,
    every,
    evaluators,
    connectorId,
  } = config;

  const workflowDefinition = {
    version: '1',
    name: `${ONLINE_EVAL_NAME_PREFIX}${name}`,
    description: 'Online evaluation created by the Evals UI',
    enabled: true,
    tags: [ONLINE_EVAL_WORKFLOW_TAG],
    triggers: [{ type: 'scheduled', with: { every } }],
    consts: {
      connector_id: connectorId,
    },
    steps: [
      {
        name: SAMPLE_TRACES_STEP_NAME,
        type: 'elasticsearch.esql.query',
        with: {
          query: buildEsqlQuery({
            indexPattern,
            extraEsqlWhere,
            windowMinutes,
            lagMinutes,
            maxTracesPerRun,
          }),
        },
      },
      {
        name: EVALUATE_EACH_STEP_NAME,
        type: 'foreach',
        foreach: SAMPLE_TRACES_OUTPUT_VALUES_TEMPLATE,
        'iteration-on-failure': ITERATION_ON_FAILURE,
        steps: [
          {
            name: EVALUATE_STEP_NAME,
            type: EVALUATE_TRACE_STEP_TYPE,
            with: {
              trace_id: TRACE_ID_TEMPLATE,
              evaluators: evaluators.map((evaluator) => ({
                name: evaluator.name,
                ...(evaluator.version ? { version: evaluator.version } : {}),
                connector_id: CONNECTOR_ID_TEMPLATE,
              })),
            },
            'on-failure': buildStepOnFailure(),
          },
          {
            name: PERSIST_STEP_NAME,
            type: PERSIST_ONLINE_SCORES_STEP_TYPE,
            with: {
              monitor: {
                id: WORKFLOW_ID_TEMPLATE,
                name: WORKFLOW_NAME_TEMPLATE,
              },
              trace_id: TRACE_ID_TEMPLATE,
              connector_id: CONNECTOR_ID_TEMPLATE,
              results: EVALUATE_RESULTS_TEMPLATE,
              errors: EVALUATE_ERRORS_TEMPLATE,
            },
            'on-failure': buildStepOnFailure(),
          },
        ],
      },
    ],
  };

  return stringifyWorkflowDefinition(workflowDefinition);
};

export const parseOnlineEvalWorkflowYaml = (yaml: string): OnlineEvalWorkflowConfig | undefined => {
  const parsed = parseYamlToJSONWithoutValidation(yaml);
  if (!parsed.success) {
    return undefined;
  }

  const workflow = parsed.json as Record<string, unknown>;
  const parsedName = parseWorkflowName(workflow.name);
  if (!parsedName) {
    return undefined;
  }

  const tags = workflow.tags;
  if (!Array.isArray(tags) || !tags.includes(ONLINE_EVAL_WORKFLOW_TAG)) {
    return undefined;
  }

  const trigger = Array.isArray(workflow.triggers)
    ? (workflow.triggers.find(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object' && item.type === 'scheduled'
      ) as Record<string, unknown> | undefined)
    : undefined;
  const every =
    trigger?.with && typeof trigger.with === 'object'
      ? (trigger.with as { every?: unknown }).every
      : undefined;
  if (typeof every !== 'string') {
    return undefined;
  }

  const consts = workflow.consts;
  const connectorId =
    consts && typeof consts === 'object'
      ? (consts as { connector_id?: unknown }).connector_id
      : undefined;
  if (typeof connectorId !== 'string') {
    return undefined;
  }

  const sampleTracesStep = getNamedStep(workflow.steps, SAMPLE_TRACES_STEP_NAME);
  if (!sampleTracesStep || sampleTracesStep.type !== 'elasticsearch.esql.query') {
    return undefined;
  }

  const sampleTracesQuery =
    sampleTracesStep.with && typeof sampleTracesStep.with === 'object'
      ? (sampleTracesStep.with as { query?: unknown }).query
      : undefined;
  if (typeof sampleTracesQuery !== 'string') {
    return undefined;
  }

  const parsedEsqlQuery = parseEsqlQuery(sampleTracesQuery);
  if (!parsedEsqlQuery) {
    return undefined;
  }

  const evaluateEachStep = getNamedStep(workflow.steps, EVALUATE_EACH_STEP_NAME);
  if (
    !evaluateEachStep ||
    evaluateEachStep.type !== 'foreach' ||
    evaluateEachStep.foreach !== SAMPLE_TRACES_OUTPUT_VALUES_TEMPLATE
  ) {
    return undefined;
  }

  const evaluateStep = getNamedStep(evaluateEachStep.steps, EVALUATE_STEP_NAME);
  if (!evaluateStep || evaluateStep.type !== EVALUATE_TRACE_STEP_TYPE) {
    return undefined;
  }

  const evaluateStepWith = getStepWith(evaluateStep);
  if (!evaluateStepWith || evaluateStepWith.trace_id !== TRACE_ID_TEMPLATE) {
    return undefined;
  }

  const evaluateStepEvaluators = evaluateStepWith.evaluators;
  if (!Array.isArray(evaluateStepEvaluators) || evaluateStepEvaluators.length === 0) {
    return undefined;
  }

  const parsedEvaluators: OnlineEvalWorkflowEvaluatorConfig[] = [];
  for (const evaluator of evaluateStepEvaluators) {
    if (!evaluator || typeof evaluator !== 'object') {
      return undefined;
    }

    const evaluatorValue = evaluator as {
      name?: unknown;
      version?: unknown;
      connector_id?: unknown;
    };

    if (typeof evaluatorValue.name !== 'string') {
      return undefined;
    }

    if (evaluatorValue.connector_id !== CONNECTOR_ID_TEMPLATE) {
      return undefined;
    }

    if (evaluatorValue.version != null && typeof evaluatorValue.version !== 'string') {
      return undefined;
    }

    parsedEvaluators.push({
      name: evaluatorValue.name,
      ...(evaluatorValue.version ? { version: evaluatorValue.version } : {}),
    });
  }

  const persistStep = getNamedStep(evaluateEachStep.steps, PERSIST_STEP_NAME);
  if (!persistStep || persistStep.type !== PERSIST_ONLINE_SCORES_STEP_TYPE) {
    return undefined;
  }

  const persistStepWith = getStepWith(persistStep);
  const persistStepMonitor =
    persistStepWith?.monitor && typeof persistStepWith.monitor === 'object'
      ? (persistStepWith.monitor as Record<string, unknown>)
      : null;
  if (
    !persistStepWith ||
    !persistStepMonitor ||
    persistStepMonitor.id !== WORKFLOW_ID_TEMPLATE ||
    persistStepMonitor.name !== WORKFLOW_NAME_TEMPLATE ||
    persistStepWith.trace_id !== TRACE_ID_TEMPLATE ||
    persistStepWith.connector_id !== CONNECTOR_ID_TEMPLATE ||
    persistStepWith.results !== EVALUATE_RESULTS_TEMPLATE ||
    persistStepWith.errors !== EVALUATE_ERRORS_TEMPLATE
  ) {
    return undefined;
  }

  return {
    name: parsedName,
    indexPattern: parsedEsqlQuery.indexPattern,
    ...(parsedEsqlQuery.extraEsqlWhere ? { extraEsqlWhere: parsedEsqlQuery.extraEsqlWhere } : {}),
    windowMinutes: parsedEsqlQuery.windowMinutes,
    lagMinutes: parsedEsqlQuery.lagMinutes,
    maxTracesPerRun: parsedEsqlQuery.maxTracesPerRun,
    every,
    evaluators: parsedEvaluators,
    connectorId,
  };
};
