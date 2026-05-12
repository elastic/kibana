/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ProcessingSimulationResponse } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import type { StreamlangStep, StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import { streamlangDSLSchema, isConditionBlock } from '@kbn/streamlang/types/streamlang';
import { ACTION_METADATA_MAP, validateStreamlang } from '@kbn/streamlang';
import type { StreamsClient } from '../../../lib/streams/client';
import { getStreamConvention } from '../../utils/convention_utils';
import { extractJson } from './nl_to_es_dsl';
import {
  annotateWithDiff,
  buildSummary,
  computeFieldChanges,
  computeSuccessRate,
  extractFieldsFromDocuments,
  extractSimulationErrors,
  injectIgnoreFailure,
  resolveSamples,
  stripIgnoreFailure,
  type FieldChange,
  type FieldInfo,
  type NlToStreamlangResult,
  type SamplesConfig,
  type SimulationMode,
} from './_pipeline_design_utils';

const MAX_RETRIES = 3;
const SIMULATION_SUCCESS_THRESHOLD = 50;
const MAX_FIELDS_IN_PROMPT = 500;

export interface NlToStreamlangParams {
  streamName: string;
  instruction: string;
  samples?: SamplesConfig;
}

export interface NlToStreamlangDeps {
  streamsClient: StreamsClient;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  simulatePipeline: (
    streamName: string,
    processing: StreamlangDSL,
    documents: Array<Record<string, unknown>>
  ) => Promise<ProcessingSimulationResponse>;
}

export const nlToStreamlang = async (
  params: NlToStreamlangParams,
  deps: NlToStreamlangDeps
): Promise<NlToStreamlangResult> => {
  const { streamName, instruction: changeDescription } = params;
  const { streamsClient, esClient, inferenceClient, simulatePipeline } = deps;

  const { documents, documentStatus, samplesInfo } = await resolveSamples(
    params.samples,
    streamName,
    esClient
  );

  const definition = await streamsClient.getStream(streamName);
  const convention = getStreamConvention(definition);
  const isWired = Streams.WiredStream.Definition.is(definition);

  let existingSteps: StreamlangStep[] = [];
  if (Streams.ingest.all.Definition.is(definition)) {
    existingSteps = definition.ingest.processing.steps;
  }

  const fieldContext = extractFieldsFromDocuments(documents);

  const systemPrompt = buildSystemPrompt(convention, isWired);
  const userMessage = buildUserMessage(fieldContext, convention, changeDescription, existingSteps);

  let lastError: Error | undefined;
  let bestSimResult:
    | {
        dsl: StreamlangDSL;
        successRate: number;
        simErrors: string[];
        fieldChanges: FieldChange[];
        hints: string[];
        simMode: SimulationMode;
      }
    | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const messageContent =
        attempt === 0 ? userMessage : buildRetryMessage(userMessage, lastError, attempt);

      const response = await inferenceClient.chatComplete({
        system: systemPrompt,
        messages: [{ role: MessageRole.User, content: messageContent }],
      });

      const raw = extractJson(response.content ?? '');
      const rawParsed = JSON.parse(raw) as { steps: unknown[]; hints?: unknown[] };
      const llmHints: string[] = Array.isArray(rawParsed.hints)
        ? rawParsed.hints.filter((h): h is string => typeof h === 'string')
        : [];
      const parsed = normalizeConditionBlocks(rawParsed);

      const validationResult = streamlangDSLSchema.safeParse(parsed);

      if (!validationResult.success) {
        const issues = validationResult.error.issues
          .map((i) => {
            const path = i.path.length > 0 ? ` at ${i.path.join('.')}` : '';
            return `${i.message}${path}`;
          })
          .join('; ');
        lastError = new Error(`Invalid Streamlang structure: ${issues}`);
        continue;
      }

      const dsl = validationResult.data;
      const structuralValidation = validateStreamlang(dsl, {
        reservedFields: [],
        streamType: isWired ? 'wired' : 'classic',
      });

      if (!structuralValidation.isValid) {
        const errs = structuralValidation.errors.map((e) => e.message).join(', ');
        lastError = new Error(`Streamlang validation failed: ${errs}`);
        continue;
      }

      if (dsl.steps.length === 0) {
        return annotateWithDiff(
          {
            steps: [],
            summary: '',
            field_changes: [],
            simulation: {
              success_rate: null,
              sample_count: documents.length,
              mode: documentStatus === 'processed' ? 'partial' : 'complete',
            },
            ...(llmHints.length > 0 && { hints: llmHints }),
            samples_info: samplesInfo,
          },
          existingSteps
        );
      }

      const cleanSteps = stripIgnoreFailure(dsl.steps);

      if (documents.length === 0) {
        return annotateWithDiff(
          {
            steps: injectIgnoreFailure(cleanSteps, existingSteps),
            summary: buildSummary(cleanSteps),
            field_changes: [],
            simulation: {
              success_rate: null,
              sample_count: 0,
              mode: 'complete',
            },
            warnings: ['No sample documents available for simulation.'],
            ...(llmHints.length > 0 && { hints: llmHints }),
            samples_info: samplesInfo,
          },
          existingSteps
        );
      }

      const { stepsToSimulate, simMode, isNonAdditive } = determineSimulationStrategy(
        existingSteps,
        cleanSteps,
        documentStatus
      );

      const taggedSteps = assignTempIds(stepsToSimulate);
      const simPipeline: StreamlangDSL = { steps: taggedSteps };
      const simResult = await simulatePipeline(streamName, simPipeline, documents);

      if (simResult.definition_error) {
        lastError = new Error(`Simulation error: ${simResult.definition_error.message}`);
        continue;
      }

      const fieldChanges = computeFieldChanges(simResult, fieldContext);
      const successRate = computeSuccessRate(simResult);
      const simErrors = extractSimulationErrors(simResult);

      if (!bestSimResult || successRate > bestSimResult.successRate) {
        bestSimResult = {
          dsl: { steps: cleanSteps },
          successRate,
          simErrors,
          fieldChanges,
          hints: llmHints,
          simMode,
        };
      }

      const fieldNotFoundErrors = simErrors.filter((e) =>
        e.includes('not present as part of path')
      );
      if (fieldNotFoundErrors.length > 0 && fieldChanges.length === 0) {
        lastError = new Error(
          `Pipeline references fields not in the documents: ${fieldNotFoundErrors.join('; ')}. ` +
            'Use ONLY fields from the Available fields list.'
        );
        continue;
      }

      if (successRate < SIMULATION_SUCCESS_THRESHOLD) {
        const errorSummary = simErrors.slice(0, 5).join('; ');
        lastError = new Error(
          `Simulation failed: ${successRate}% success rate` +
            ` (${simErrors.length} distinct error${simErrors.length !== 1 ? 's' : ''}). ` +
            `Errors: ${errorSummary}. ` +
            'Review the available fields list and fix the pipeline to use correct field names and patterns.'
        );
        continue;
      }

      const warnings: string[] = [];
      if (simErrors.length > 0) {
        warnings.push(
          `${successRate}% success rate with ${simErrors.length} error type(s): ${simErrors
            .slice(0, 3)
            .join('; ')}`
        );
      }
      if (isNonAdditive) {
        warnings.push(
          'Simulation is partial — existing steps were modified and documents already reflect prior processing. Results may not be fully accurate.'
        );
      }

      return annotateWithDiff(
        {
          steps: injectIgnoreFailure(cleanSteps, existingSteps),
          summary: buildSummary(cleanSteps),
          field_changes: fieldChanges,
          simulation: {
            success_rate: successRate,
            ...(simErrors.length > 0 && { errors: simErrors }),
            sample_count: documents.length,
            mode: simMode,
          },
          ...(warnings.length > 0 && { warnings }),
          ...(llmHints.length > 0 && { hints: llmHints }),
          samples_info: samplesInfo,
        },
        existingSteps
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (bestSimResult) {
    const { dsl, successRate, simErrors, fieldChanges, hints, simMode } = bestSimResult;
    if (successRate < SIMULATION_SUCCESS_THRESHOLD) {
      throw new Error(
        `Pipeline simulation failed after ${
          MAX_RETRIES + 1
        } attempts: best success rate was ${successRate}% ` +
          `(threshold: ${SIMULATION_SUCCESS_THRESHOLD}%). Errors: ${simErrors
            .slice(0, 3)
            .join('; ')}. ` +
          'Try a different approach or simplify the instruction.'
      );
    }
    const bestSteps = injectIgnoreFailure(stripIgnoreFailure(dsl.steps), existingSteps);
    return annotateWithDiff(
      {
        steps: bestSteps,
        summary: buildSummary(bestSteps),
        field_changes: fieldChanges,
        simulation: {
          success_rate: successRate,
          ...(simErrors.length > 0 && { errors: simErrors }),
          sample_count: documents.length,
          mode: simMode,
        },
        warnings: [
          `Best result after ${MAX_RETRIES + 1} attempts: ${successRate}% success rate.`,
          ...simErrors.slice(0, 3),
        ],
        ...(hints.length > 0 && { hints }),
        samples_info: samplesInfo,
      },
      existingSteps
    );
  }

  throw new Error(
    `Failed to generate valid Streamlang after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`
  );
};

// ---------------------------------------------------------------------------
// System / user prompt construction
// ---------------------------------------------------------------------------

const buildSystemPrompt = (convention: 'ecs' | 'otel', isWired: boolean): string => {
  const conventionGuide =
    convention === 'ecs'
      ? 'Use ECS field names: log.level, service.name, host.name, @timestamp, message'
      : [
          'Use OTel field names. Map common concepts to their canonical OTel paths:',
          '  - IP addresses → attributes.source.ip / attributes.destination.ip',
          '  - HTTP status → attributes.http.response.status_code',
          '  - HTTP method → attributes.http.request.method_original',
          '  - URL path → attributes.url.path',
          '  - Response size → attributes.http.response.body.size',
          '  - Service name → resource.attributes.service.name',
          '  - Host name → resource.attributes.host.name',
          '  - Process ID → resource.attributes.process.pid',
          '  - User agent → resource.attributes.user_agent.original',
          '  - User ID → attributes.user.id',
          '  - Log level → severity_text',
          '  - Raw message → body.text',
          '  - Other custom fields → attributes.<domain>.<name>',
          'When the user says "extract X", always use the canonical OTel path — do NOT use a bare name like attributes.ip or attributes.status_code.',
        ].join('\n');

  const wiredConstraint = isWired
    ? '\n- This is a wired stream. Custom/extracted fields MUST go in attributes.*, body.structured.*, or resource.attributes.* — do NOT write to inherited ECS fields (log.level, message, etc.) directly.'
    : '';

  const processorCatalog = Object.entries(ACTION_METADATA_MAP)
    .map(([, meta]) => {
      const example = meta.examples[0];
      const tips = meta.tips?.map((t) => `  Tip: ${t}`).join('\n') ?? '';
      return [
        `### ${meta.name}`,
        meta.description,
        `Parameters: ${meta.usage}`,
        `Example:\n${example.yaml}`,
        ...(tips ? [tips] : []),
      ].join('\n');
    })
    .join('\n\n');

  return [
    'You modify stream processing pipelines based on natural language descriptions.',
    'You receive the current pipeline (which may be empty) and a description of what to change.',
    'Return the COMPLETE updated pipeline — not just the diff.',
    '',
    'Respond with ONLY a valid JSON object. No markdown fences, no explanation, no text before or after.',
    '',
    'The JSON object must have a "steps" array and an optional "hints" array:',
    '{ "steps": [ ... ], "hints": [ ... ] }',
    '',
    'Include a hint string when:',
    "- The user's description references a field not in the available fields list (say which field you mapped to instead, or that you omitted the step)",
    '- The user requests a transformation that cannot be expressed in Streamlang (say what was skipped and why)',
    "- You had to make an assumption or best-guess interpretation of the user's intent",
    'Do NOT include hints for normal, successful operations.',
    '',
    `## Schema convention: ${convention}`,
    conventionGuide,
    '',
    '## Available processor types:',
    processorCatalog,
    '',
    '## Condition syntax:',
    '### Condition operators:',
    '- Equality: {"field": "log.level", "eq": "error"}',
    '- Boolean: {"and": [...]}, {"or": [...]}, {"not": {...}}',
    '- Comparison: {"field": "status", "gt": 400}',
    '- Existence: {"field": "user.name", "exists": true}',
    '',
    '### Inline condition (`where`):',
    'Use `where` on a single step to restrict when it runs:',
    '{"action": "set", "to": "attributes.priority", "value": "high", "where": {"field": "log.level", "eq": "error"}}',
    '',
    '### Condition block (for multiple steps sharing a condition):',
    'IMPORTANT: The `steps` array goes INSIDE the `condition` object, NOT as a sibling:',
    '{"condition": {"field": "user.name", "eq": "admin", "steps": [',
    '  {"action": "set", "to": "attributes.is_admin", "value": "true"},',
    '  {"action": "set", "to": "attributes.priority", "value": "high"}',
    ']}}',
    '',
    '## Rules:',
    '- The "Available fields" list below shows EVERY field present in the sample documents with example values. Use ONLY these exact field names.',
    '- If the description references a field that does not exist in the list and no close match exists, do NOT fabricate it. Return { "steps": [], "hints": ["Field \'X\' does not exist in the documents. Available fields: ..."] } instead.',
    '- An empty pipeline with a clear hint is better than a broken pipeline that references non-existent fields.',
    '- Use `where` for single-step inline conditions.',
    '- Use a `condition` block when multiple steps share the same condition.',
    '- Do NOT add `ignore_failure` to any processors. The system adds failure handling automatically after validation.',
    '- When writing grok/dissect patterns, study the sample values in the Available fields list carefully. If `body.text` (or `message`) contains multiple log formats (e.g. nginx, syslog, app logs), write MULTIPLE grok patterns to match each format — do not write a single pattern that only matches one format.',
    `- Apply the change described to the current pipeline and return the COMPLETE result.${wiredConstraint}`,
  ].join('\n');
};

const buildUserMessage = (
  fields: FieldInfo[],
  convention: 'ecs' | 'otel',
  changeDescription: string,
  existingSteps: StreamlangStep[]
): string => {
  const fieldList = fields
    .slice(0, MAX_FIELDS_IN_PROMPT)
    .map((f) => {
      if (!f.sample_values || f.sample_values.length === 0) {
        return `${f.name}: ${f.type}`;
      }
      const truncatedSamples = f.sample_values.map((v) => {
        const s = String(v);
        return s.length > 80 ? `"${s.slice(0, 77)}..."` : `"${s}"`;
      });
      const distinctCount = f.distinct_count ?? f.sample_values.length;
      const plural = distinctCount !== 1 ? 's' : '';
      return `${f.name}: ${
        f.type
      } (${distinctCount} distinct value${plural}, e.g.: ${truncatedSamples.join(', ')})`;
    })
    .join('\n');

  const parts = [`Available fields (${convention.toUpperCase()} convention):\n${fieldList}`];

  if (existingSteps.length > 0) {
    const pipelineJson = JSON.stringify({ steps: existingSteps }, null, 2);
    const stepPlural = existingSteps.length !== 1 ? 's' : '';
    parts.push(`\nCurrent pipeline (${existingSteps.length} step${stepPlural}):\n${pipelineJson}`);
  } else {
    parts.push('\nCurrent pipeline: empty (no processing steps defined yet)');
  }

  parts.push(`\nChange description: ${changeDescription}`);
  return parts.join('\n');
};

const buildRetryMessage = (
  userMessage: string,
  error: Error | undefined,
  attempt: number
): string => {
  const parts = [userMessage];

  parts.push(`\n## Self-correction (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
  parts.push(`\nYour previous pipeline failed. ${error?.message ?? 'Unknown error.'}`);

  parts.push(
    [
      '\n### How to fix:',
      '- Cross-reference every field name in your pipeline against the "Available fields" list above. Use ONLY fields that exist in that list.',
      '- If a grok or dissect pattern produced 0% match rate, study the sample values in the field list and rewrite the pattern to match the actual data format.',
      '- If the description references fields or structures not present in the data, return { "steps": [], "hints": ["..."] } explaining why the request cannot be fulfilled.',
      '- Do NOT repeat the same mistake. If a field was reported as missing, do not use it again.',
    ].join('\n')
  );

  return parts.join('\n');
};

// ---------------------------------------------------------------------------
// LLM-output normalisation
// ---------------------------------------------------------------------------

/**
 * LLMs commonly produce condition blocks with `steps` as a sibling of `condition`
 * instead of nested inside it. This normalizes that pattern before Zod validation.
 *
 * Wrong:  { condition: { field, eq }, steps: [...] }
 * Right:  { condition: { field, eq, steps: [...] } }
 */
const normalizeConditionBlocks = (obj: { steps: unknown[] }): { steps: unknown[] } => {
  if (!obj.steps || !Array.isArray(obj.steps)) return obj;
  return {
    ...obj,
    steps: obj.steps.map((step) => {
      if (typeof step !== 'object' || step === null) return step;
      const s = step as Record<string, unknown>;

      if (
        'condition' in s &&
        'steps' in s &&
        typeof s.condition === 'object' &&
        s.condition !== null
      ) {
        const { condition, steps: innerSteps, ...rest } = s;
        const cond = condition as Record<string, unknown>;
        if (!('steps' in cond)) {
          const normalized = {
            ...rest,
            condition: {
              ...cond,
              steps: Array.isArray(innerSteps)
                ? innerSteps.map((inner) =>
                    typeof inner === 'object' && inner !== null
                      ? normalizeConditionBlocks({ steps: [inner] }).steps[0]
                      : inner
                  )
                : innerSteps,
              ...(s.else != null && {
                else: Array.isArray(s.else)
                  ? s.else.map((inner) =>
                      typeof inner === 'object' && inner !== null
                        ? normalizeConditionBlocks({ steps: [inner as unknown] }).steps[0]
                        : inner
                    )
                  : s.else,
              }),
            },
          };
          if ('else' in normalized) delete (normalized as Record<string, unknown>).else;
          return normalized;
        }
      }

      if ('condition' in s && typeof s.condition === 'object' && s.condition !== null) {
        const cond = s.condition as Record<string, unknown>;
        if ('steps' in cond && Array.isArray(cond.steps)) {
          return {
            ...s,
            condition: {
              ...cond,
              steps: (cond.steps as unknown[]).map((inner) =>
                typeof inner === 'object' && inner !== null
                  ? normalizeConditionBlocks({ steps: [inner] }).steps[0]
                  : inner
              ),
              ...(cond.else != null && Array.isArray(cond.else)
                ? {
                    else: (cond.else as unknown[]).map((inner) =>
                      typeof inner === 'object' && inner !== null
                        ? normalizeConditionBlocks({ steps: [inner] }).steps[0]
                        : inner
                    ),
                  }
                : {}),
            },
          };
        }
      }

      return step;
    }),
  };
};

// ---------------------------------------------------------------------------
// Simulation strategy
// ---------------------------------------------------------------------------

const stepsAreEqual = (a: StreamlangStep, b: StreamlangStep): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

const existingStepsPreserved = (
  cleanExisting: StreamlangStep[],
  newSteps: StreamlangStep[]
): boolean => {
  if (newSteps.length < cleanExisting.length) return false;
  return cleanExisting.every((step, i) => stepsAreEqual(step, newSteps[i]));
};

const determineSimulationStrategy = (
  existingSteps: StreamlangStep[],
  newSteps: StreamlangStep[],
  documentStatus: 'processed' | 'unprocessed'
): { stepsToSimulate: StreamlangStep[]; simMode: SimulationMode; isNonAdditive: boolean } => {
  if (documentStatus === 'unprocessed') {
    return {
      stepsToSimulate: newSteps,
      simMode: 'complete',
      isNonAdditive: false,
    };
  }

  if (existingSteps.length === 0) {
    return {
      stepsToSimulate: newSteps,
      simMode: 'complete',
      isNonAdditive: false,
    };
  }

  const cleanExisting = stripIgnoreFailure(existingSteps);

  if (existingStepsPreserved(cleanExisting, newSteps)) {
    const addedSteps = newSteps.slice(cleanExisting.length);
    if (addedSteps.length > 0) {
      return {
        stepsToSimulate: addedSteps,
        simMode: 'partial',
        isNonAdditive: false,
      };
    }
  }

  const addedSteps = newSteps.slice(cleanExisting.length);
  const isNonAdditive =
    addedSteps.length !== newSteps.length || newSteps.length < cleanExisting.length;

  return {
    stepsToSimulate: addedSteps.length > 0 ? addedSteps : newSteps,
    simMode: 'partial',
    isNonAdditive,
  };
};

const assignTempIds = (steps: StreamlangStep[]): StreamlangStep[] => {
  let counter = 0;
  const assign = (innerSteps: StreamlangStep[]): StreamlangStep[] => {
    return innerSteps.map((step) => {
      if (isConditionBlock(step)) {
        return {
          ...step,
          customIdentifier: step.customIdentifier ?? `_sim_${counter++}`,
          condition: {
            ...step.condition,
            steps: assign(step.condition.steps),
            ...(step.condition.else && { else: assign(step.condition.else) }),
          },
        };
      }
      return {
        ...step,
        customIdentifier:
          (step as { customIdentifier?: string }).customIdentifier ?? `_sim_${counter++}`,
      };
    });
  };
  return assign(steps);
};
