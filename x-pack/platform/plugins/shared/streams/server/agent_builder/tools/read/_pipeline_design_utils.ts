/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared utilities for the pipeline-design family of tools (`design_pipeline`,
 * `extract_fields: true` mode, `refine_extracted_field`). These helpers
 * originally lived inside `nl_to_streamlang.ts` but the surface grew large
 * enough that consumers were importing pure utilities from a file named after
 * the LLM-driven entry point. This module collects the genuinely tool-agnostic
 * pieces:
 *
 * - Result-shape types (`NlToStreamlangResult`, `FieldChange`, …) consumed by
 *   every pipeline-design tool's response.
 * - Sample / field discovery (`resolveSamples`, `extractFieldsFromDocuments`).
 * - Simulation-result analysis (`computeFieldChanges`, `computeSuccessRate`,
 *   `extractSimulationErrors`).
 * - Streamlang step manipulation (`stripIgnoreFailure`, `injectIgnoreFailure`,
 *   `annotateWithDiff`, `buildSummary`).
 *
 * Anything specific to translating natural-language instructions into
 * Streamlang via the LLM (prompts, retry loop, simulation-strategy picker)
 * stays in `nl_to_streamlang.ts`.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ProcessingSimulationResponse } from '@kbn/streams-schema';
import type { StreamlangStep } from '@kbn/streamlang/types/streamlang';
import { isConditionBlock } from '@kbn/streamlang/types/streamlang';
import { getFlattenedObject } from '@kbn/std';
import { omit } from 'lodash';
import { flattenAndTruncateDocs } from './query_documents';
import { buildDropWarnings, computePipelineDiff, type StepChange } from './pipeline_diff';

const MAX_SAMPLE_VALUES_PER_FIELD = 3;
const SAMPLE_VALUE_TRUNCATE_LENGTH = 200;
const DEFAULT_SAMPLE_SIZE = 100;

// ---------------------------------------------------------------------------
// Result-shape types
// ---------------------------------------------------------------------------

export type SamplesConfig =
  | { source: 'stream'; size?: number }
  | {
      source: 'inline';
      documents: Array<Record<string, unknown>>;
      status: 'processed' | 'unprocessed';
    };

export interface FieldChange {
  field: string;
  change: 'created' | 'removed' | 'modified';
  type?: string;
  sample_values?: Array<string | number | boolean>;
}

export type SimulationMode = 'complete' | 'partial';

export interface NlToStreamlangResult {
  /**
   * The complete proposed pipeline that would replace the stream's current
   * processing. Apply by passing this array unchanged to `update_stream`'s
   * `changes.processing`.
   */
  steps: StreamlangStep[];
  /**
   * The pipeline as it was when the tool ran. Surfaced so the agent can show a
   * before/after diff to the user — never overwrite without acknowledging what
   * existed.
   */
  existing_steps: StreamlangStep[];
  /**
   * Per-step structural diff between `existing_steps` and `steps`. The agent
   * uses this to flag silently dropped steps and ask the user before applying.
   */
  step_changes: StepChange[];
  summary: string;
  field_changes: FieldChange[];
  simulation: {
    success_rate: number | null;
    errors?: string[];
    sample_count: number;
    mode: SimulationMode;
  };
  warnings?: string[];
  hints?: string[];
  samples_info: { source: 'stream' | 'inline'; count: number };
}

export interface FieldInfo {
  name: string;
  type: string;
  sample_values?: Array<string | number | boolean>;
  distinct_count?: number;
}

// ---------------------------------------------------------------------------
// Sample document loading
// ---------------------------------------------------------------------------

const fetchSampleDocuments = async (
  esClient: ElasticsearchClient,
  streamName: string,
  size: number
): Promise<Array<Record<string, unknown>>> => {
  const response = await esClient.search({
    index: streamName,
    sort: [{ '@timestamp': { order: 'desc' as const } }],
    size,
    ignore_unavailable: true,
  });
  return flattenAndTruncateDocs(response.hits.hits);
};

export const resolveSamples = async (
  samples: SamplesConfig | undefined,
  streamName: string,
  esClient: ElasticsearchClient
): Promise<{
  documents: Array<Record<string, unknown>>;
  documentStatus: 'processed' | 'unprocessed';
  samplesInfo: { source: 'stream' | 'inline'; count: number };
}> => {
  if (!samples || samples.source === 'stream') {
    const size =
      samples?.source === 'stream' ? samples.size ?? DEFAULT_SAMPLE_SIZE : DEFAULT_SAMPLE_SIZE;
    const documents = await fetchSampleDocuments(esClient, streamName, size);
    return {
      documents,
      documentStatus: 'processed',
      samplesInfo: { source: 'stream', count: documents.length },
    };
  }
  return {
    documents: samples.documents,
    documentStatus: samples.status,
    samplesInfo: { source: 'inline', count: samples.documents.length },
  };
};

// ---------------------------------------------------------------------------
// Document-grounded field extraction
// ---------------------------------------------------------------------------

const inferEsType = (jsTypes: Set<string>): string => {
  if (jsTypes.has('number')) return 'long';
  if (jsTypes.has('boolean')) return 'boolean';
  return 'keyword';
};

export const extractFieldsFromDocuments = (
  documents: Array<Record<string, unknown>>
): FieldInfo[] => {
  const fieldMap = new Map<
    string,
    { types: Set<string>; samples: Set<string | number | boolean>; totalCount: number }
  >();

  for (const doc of documents) {
    const flat = getFlattenedObject(doc);
    for (const [key, value] of Object.entries(flat)) {
      if (!fieldMap.has(key)) {
        fieldMap.set(key, { types: new Set(), samples: new Set(), totalCount: 0 });
      }
      const entry = fieldMap.get(key)!;
      entry.totalCount++;
      if (value != null) {
        entry.types.add(typeof value);
        if (entry.samples.size < MAX_SAMPLE_VALUES_PER_FIELD) {
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            const truncated =
              typeof value === 'string' && value.length > SAMPLE_VALUE_TRUNCATE_LENGTH
                ? value.slice(0, SAMPLE_VALUE_TRUNCATE_LENGTH)
                : value;
            entry.samples.add(truncated);
          }
        }
      }
    }
  }

  return Array.from(fieldMap.entries()).map(([name, { types, samples }]) => ({
    name,
    type: inferEsType(types),
    sample_values: Array.from(samples),
    distinct_count: samples.size,
  }));
};

// ---------------------------------------------------------------------------
// Simulation result analysis
// ---------------------------------------------------------------------------

const extractSampleValues = (
  simResult: ProcessingSimulationResponse,
  fieldName: string
): Array<string | number | boolean> => {
  const values: Array<string | number | boolean> = [];
  const seen = new Set<string | number | boolean>();

  for (const docReport of simResult.documents) {
    const doc = docReport.value;
    if (!doc || typeof doc !== 'object') continue;
    const val = (doc as Record<string, unknown>)[fieldName];
    if (
      (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') &&
      !seen.has(val)
    ) {
      values.push(val);
      seen.add(val);
      if (values.length >= 5) break;
    }
  }

  return values;
};

export const computeFieldChanges = (
  simResult: ProcessingSimulationResponse,
  baseFields: FieldInfo[]
): FieldChange[] => {
  const baseFieldNames = new Set(baseFields.map((f) => f.name));
  const changes: FieldChange[] = [];

  for (const detected of simResult.detected_fields) {
    if (!baseFieldNames.has(detected.name)) {
      const sampleValues = extractSampleValues(simResult, detected.name);
      changes.push({
        field: detected.name,
        change: 'created',
        type: detected.esType,
        ...(sampleValues.length > 0 && { sample_values: sampleValues }),
      });
    }
  }

  return changes;
};

export const computeSuccessRate = (simResult: ProcessingSimulationResponse): number => {
  const metrics = simResult.documents_metrics;
  if (!metrics) return 100;
  const failedRate = metrics.failed_rate ?? 0;
  const partiallyParsedRate = metrics.partially_parsed_rate ?? 0;
  return Math.round((1 - failedRate - partiallyParsedRate) * 100);
};

export const extractSimulationErrors = (simResult: ProcessingSimulationResponse): string[] => {
  const errors = new Set<string>();
  for (const docReport of simResult.documents) {
    if (docReport.status === 'failed' || docReport.status === 'partially_parsed') {
      for (const simError of docReport.errors) {
        if (simError.message) {
          errors.add(simError.message);
        }
      }
    }
  }
  return Array.from(errors).slice(0, 5);
};

// ---------------------------------------------------------------------------
// Streamlang step manipulation
// ---------------------------------------------------------------------------

export const stripIgnoreFailure = (steps: StreamlangStep[]): StreamlangStep[] => {
  return steps.map((step) => {
    if (isConditionBlock(step)) {
      return {
        ...step,
        condition: {
          ...step.condition,
          steps: stripIgnoreFailure(step.condition.steps),
          ...(step.condition.else && { else: stripIgnoreFailure(step.condition.else) }),
        },
      };
    }
    return omit(step, 'ignore_failure') as StreamlangStep;
  });
};

/**
 * Attach a structural diff against the existing pipeline to the result and
 * fold any "step would be removed" warnings into the result's `warnings`
 * array. Keeps the early-return sites in pipeline-design tools consistent:
 * every result the agent receives carries `existing_steps`, `step_changes`,
 * and any drop warnings — so silent overwrites become impossible.
 *
 * **All pipeline-design success paths must produce `existing_steps` /
 * `step_changes` through this helper.** It is the only place that strips
 * `ignore_failure` from both sides before computing the diff, so calling
 * `computePipelineDiff` + `buildDropWarnings` directly produces a result
 * whose shape drifts from `nl_to_streamlang` / `refine_extracted_field` /
 * `extract_fields` — and the skill prompt (which branches on a single
 * agreed shape) has no way to special-case the difference.
 */
export const annotateWithDiff = (
  result: Omit<NlToStreamlangResult, 'existing_steps' | 'step_changes'>,
  existingSteps: StreamlangStep[]
): NlToStreamlangResult => {
  const cleanExisting = stripIgnoreFailure(existingSteps);
  const cleanProposed = stripIgnoreFailure(result.steps);
  const diff = computePipelineDiff(cleanExisting, cleanProposed);
  const dropWarnings = buildDropWarnings(diff);
  const mergedWarnings = [...(result.warnings ?? []), ...dropWarnings];
  return {
    ...result,
    existing_steps: cleanExisting,
    step_changes: diff.changes,
    ...(mergedWarnings.length > 0 && { warnings: mergedWarnings }),
  };
};

/**
 * Build a structural identity key for a step that ignores both
 * `ignore_failure` and `customIdentifier`. We strip `customIdentifier`
 * because it is regenerated by `addDeterministicCustomIdentifiers`
 * during the merge, so two structurally identical steps can carry
 * different identifiers and would otherwise compare as different.
 */
const structuralKey = (step: StreamlangStep): string => {
  if (isConditionBlock(step)) {
    return JSON.stringify(omit(step as unknown as Record<string, unknown>, 'customIdentifier'));
  }
  return JSON.stringify(omit(step, ['ignore_failure', 'customIdentifier']));
};

/**
 * Add `ignore_failure: true` to steps that are **not** in `preserveSteps`.
 * Existing steps keep their original `ignore_failure` value so the agent
 * never silently changes a user-configured `ignore_failure: false`.
 */
export const injectIgnoreFailure = (
  steps: StreamlangStep[],
  preserveSteps?: StreamlangStep[]
): StreamlangStep[] => {
  const preserveKeys = preserveSteps
    ? new Set(stripIgnoreFailure(preserveSteps).map(structuralKey))
    : undefined;

  return steps.map((step) => {
    if (preserveKeys && preserveKeys.has(structuralKey(step))) {
      return step;
    }

    if (isConditionBlock(step)) {
      return {
        ...step,
        condition: {
          ...step.condition,
          steps: injectIgnoreFailure(step.condition.steps, preserveSteps),
          ...(step.condition.else && {
            else: injectIgnoreFailure(step.condition.else, preserveSteps),
          }),
        },
      };
    }
    return { ...step, ignore_failure: true } as StreamlangStep;
  });
};

export const buildSummary = (steps: StreamlangStep[]): string => {
  const parts: string[] = [];
  for (const step of steps) {
    if ('action' in step) {
      const action = step.action as string;
      const from = 'from' in step ? (step as unknown as { from: string }).from : undefined;
      parts.push(from ? `${action}: ${from}` : action);
    } else if ('condition' in step) {
      const innerCount = step.condition.steps.length;
      parts.push(`conditional (${innerCount} inner step${innerCount !== 1 ? 's' : ''})`);
    }
  }
  return parts.join(', ');
};
