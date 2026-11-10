/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { EcsFields } from './scoring/ecs_fields';
import { isValidEcsValue } from './scoring/ecs_value_checks';
import { normalizeValue } from './scoring/normalize_value';
import type { ExtraField } from './scoring/score_run';
import { extraFieldKey, findExtraFields } from './scoring/score_run';
import type {
  AutomaticImportExampleExpected,
  AutomaticImportExampleInput,
  AutomaticImportRunOutput,
} from './types';

export type CreateCriteriaEvaluator = (criteria: EvaluationCriterion[]) => Evaluator;

export interface ExtraFieldJudgeParams {
  readonly input?: AutomaticImportExampleInput;
  readonly output: AutomaticImportRunOutput;
  readonly expected: AutomaticImportExampleExpected;
}

/** Resolves to the keys (see `extraFieldKey`) of the extra fields that are correct. */
export type JudgeExtraFields = (params: ExtraFieldJudgeParams) => Promise<ReadonlySet<string>>;

export interface ExtraFieldJudge {
  readonly judgeExtraFields: JudgeExtraFields;
  /** The judge's model, recorded on the scores that use the judge. */
  readonly getModel: NonNullable<Evaluator['getModel']>;
}

const MAX_EXAMPLES_PER_FIELD = 5;
/** Verdicts on borderline fields flip between calls, even at temperature 0, so the majority decides. */
const JUDGE_VOTES = 3;
/** Judge calls take seconds; model calls have no timeout of their own and have hung for minutes. */
const VOTE_TIMEOUT_MS = 5 * 60_000;

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer within ${ms / 60_000} minutes`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

interface FieldExample {
  readonly line: number;
  readonly value: unknown;
}

const groupByField = (extras: readonly ExtraField[]): Map<string, ExtraField[]> =>
  extras.reduce(
    (groups, extra) => groups.set(extra.field, [...(groups.get(extra.field) ?? []), extra]),
    new Map<string, ExtraField[]>()
  );

/**
 * Up to a few examples per field, with 1-based line numbers: each distinct value once, then more
 * lines whose value repeats, so a value set on every line isn't judged from one line alone.
 */
const toExamples = (extras: readonly ExtraField[]): FieldExample[] => {
  const isFirstOfValue = ({ value }: ExtraField, index: number) =>
    extras.findIndex((other) => normalizeValue(other.value) === normalizeValue(value)) === index;
  return [
    ...extras.filter(isFirstOfValue),
    ...extras.filter((extra, index) => !isFirstOfValue(extra, index)),
  ]
    .slice(0, MAX_EXAMPLES_PER_FIELD)
    .map(({ line, value }) => ({ line: line + 1, value }));
};

/**
 * How Elastic integrations use fields whose verdicts judges disagree on, from the integration
 * authoring guidelines. `event.created` follows integration practice rather than its ECS summary.
 */
const FIELD_GUIDANCE: Readonly<Record<string, string>> = {
  'event.kind':
    '`alert` is for detections reported by an external security product, `state` for findings ' +
    'or posture results about a resource at a point in time, and `event` for other logs.',
  'event.outcome':
    'Set it only when the event has a success or failure result, from the point of view of the ' +
    'system that logged it; `unknown` means an attempt whose result the log does not show. FAIL ' +
    'it on purely informational events.',
  'event.created':
    'Integrations use it for when the source system created or recorded the event, when that ' +
    'differs from `@timestamp`.',
};

const toCriterion = (field: string, ecsFields: EcsFields): EvaluationCriterion => {
  const { short, allowedValues = [] } = ecsFields.get(field) ?? {};
  // Judges misremember ECS allowed values, such as calling `info` an invalid `event.type`.
  const allowed =
    allowedValues.length > 0
      ? ` ECS allows these values: ${allowedValues.map(({ name }) => name).join(', ')}.`
      : '';
  const guidance = FIELD_GUIDANCE[field] ? ` ${FIELD_GUIDANCE[field]}` : '';
  return {
    id: field,
    text:
      `\`${field}\`${
        short ? ` (ECS: ${short})` : ''
      } holds the right value for every line listed ` +
      'under it in the output: the value comes from that log line, or is correctly derived from ' +
      'it, and is what the ECS field describes. FAIL if any listed value is wrong, is a guess ' +
      'the line does not support, or describes something related but different, such as an ' +
      'identifier of another kind of object. Every value has already been checked against the ' +
      `field's type and ECS allowed values, so judge only whether it is right for its line.${allowed}${guidance}`,
  };
};

const passedCriteria = (metadata: Record<string, unknown> | undefined): Set<string> => {
  const criteria = metadata?.criteria;
  if (!Array.isArray(criteria)) {
    throw new Error('The judge returned no verdicts for the extra fields');
  }
  return new Set(
    criteria
      .filter(({ id, result }) => typeof id === 'string' && result === 'PASS')
      .map(({ id }) => id)
  );
};

const judge = async (
  { input, output, expected }: ExtraFieldJudgeParams,
  ecsFields: EcsFields,
  createCriteriaEvaluator: CreateCriteriaEvaluator
): Promise<ReadonlySet<string>> => {
  const validExtras = findExtraFields(output, expected, ecsFields).filter((extra) =>
    isValidEcsValue(extra, ecsFields)
  );
  if (validExtras.length === 0) {
    return new Set();
  }
  if (!input) {
    throw new Error('Missing example input');
  }

  const groups = groupByField(validExtras);
  const examples = Object.fromEntries(
    [...groups].map(([field, extras]) => [field, toExamples(extras)])
  );
  const lineNumbers = [
    ...new Set(
      Object.values(examples).flatMap((fieldExamples) => fieldExamples.map(({ line }) => line))
    ),
  ].sort((a, b) => a - b);

  const evaluator = createCriteriaEvaluator(
    [...groups.keys()].map((field) => toCriterion(field, ecsFields))
  );
  const results = await Promise.allSettled(
    Array.from({ length: JUDGE_VOTES }, async () => {
      const { metadata } = await withTimeout(
        evaluator.evaluate({
          input: {
            description: input.description,
            lines: Object.fromEntries(lineNumbers.map((line) => [line, input.lines[line - 1]])),
          },
          output: examples,
          expected: null,
          metadata: null,
        }),
        VOTE_TIMEOUT_MS
      );
      return passedCriteria(metadata);
    })
  );
  const votes = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  if (votes.length === 0) {
    const reasons = results.map((result) => (result.status === 'rejected' ? result.reason : ''));
    throw new Error(`Every judge vote failed: ${reasons.join('; ')}`);
  }

  const passed = (field: string) =>
    votes.filter((passedFields) => passedFields.has(field)).length * 2 > votes.length;
  return new Set(
    validExtras
      .filter(({ field }) => passed(field))
      .map(({ line, field }) => extraFieldKey(line, field))
  );
};

/**
 * Judges generated fields the reference doesn't set: each must be valid ECS, then the judge
 * decides per field whether the values are right for their log lines.
 */
export const createExtraFieldJudge = (
  ecsFields: EcsFields,
  createCriteriaEvaluator: CreateCriteriaEvaluator
): ExtraFieldJudge => {
  // Several scores judge the same run, so the judge runs once per run and they share its verdicts.
  const verdicts = new Map<string, Promise<ReadonlySet<string>>>();
  return {
    judgeExtraFields: (params) => {
      const { runId } = params.output;
      const cached = verdicts.get(runId);
      if (cached) {
        return cached;
      }
      const pending = judge(params, ecsFields, createCriteriaEvaluator);
      verdicts.set(runId, pending);
      return pending;
    },
    // Building an evaluator doesn't call the model; it only carries the judge's model.
    getModel: () => createCriteriaEvaluator([]).getModel?.(),
  };
};
