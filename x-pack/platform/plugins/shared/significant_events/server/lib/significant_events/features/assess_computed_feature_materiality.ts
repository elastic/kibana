/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { BoundInferenceClient, ToolSchema } from '@kbn/inference-common';
import { type BaseFeature, LOG_SAMPLES_FEATURE_TYPE } from '@kbn/significant-events-schema';

const MAX_PROPERTIES_CHARS = 6_000;

const MATERIALITY_SCHEMA = {
  type: 'object',
  properties: {
    material_change: {
      type: 'boolean',
      description:
        'True if the computed features changed in a way that is relevant to query generation (e.g. new/removed fields, new log-message structures, new error classes, a changed dataset schema shape). False if only volatile values shifted (counts, sampled values, distributions, ordering).',
    },
    reason: {
      type: 'string',
      description: 'One short sentence justifying the decision, citing the specific change or lack thereof.',
    },
  },
  required: ['material_change', 'reason'],
} as const satisfies ToolSchema;

export interface AssessComputedFeatureMaterialityResult {
  materialChange: boolean;
  reason: string;
}

const truncate = (value: string): string =>
  value.length > MAX_PROPERTIES_CHARS ? `${value.slice(0, MAX_PROPERTIES_CHARS)}…[truncated]` : value;

// Query generation consumes every computed type except log_samples, so exclude it here too.
const toComparable = (features: BaseFeature[]) =>
  features
    .filter((feature) => feature.type !== LOG_SAMPLES_FEATURE_TYPE)
    .map(({ id, type, title, description, properties }) => ({
      id,
      type,
      title,
      description,
      properties: truncate(JSON.stringify(properties ?? {})),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

const SYSTEM_PROMPT = `You compare two snapshots of a data stream's computed knowledge features (the previous \
snapshot and the freshly recomputed one). Computed features carry volatile fields — document counts, \
sampled values, value distributions, ordering — that shift on every run even when nothing query-relevant \
changed. Decide whether the difference is meaningful enough to justify regenerating detection queries for \
the stream. Treat volatile shifts as NOT material. Treat structural or semantic changes as material: new or \
removed fields, new log-message patterns/structures, new error types or exception classes, a changed \
dataset schema shape, or a materially different set of features. When in doubt, prefer flagging a material \
change over missing one.`;

/** Fails open (`materialChange: true`) with no prior set or on LLM error, so queries are not silently skipped. */
export async function assessComputedFeatureMateriality({
  inferenceClient,
  previous,
  current,
  logger,
  signal,
}: {
  inferenceClient: BoundInferenceClient;
  previous: BaseFeature[];
  current: BaseFeature[];
  logger: Logger;
  signal?: AbortSignal;
}): Promise<AssessComputedFeatureMaterialityResult> {
  const previousComparable = toComparable(previous);
  const currentComparable = toComparable(current);

  if (previousComparable.length === 0) {
    return { materialChange: true, reason: 'No previous computed features to compare against.' };
  }

  try {
    const { output } = await inferenceClient.output({
      id: 'assess_computed_feature_materiality',
      system: SYSTEM_PROMPT,
      schema: MATERIALITY_SCHEMA,
      abortSignal: signal,
      input: `## Previous computed features
${JSON.stringify(previousComparable, null, 2)}

## Current computed features
${JSON.stringify(currentComparable, null, 2)}`,
    });

    return { materialChange: output.material_change, reason: output.reason };
  } catch (error) {
    logger.warn(
      `Computed-feature materiality assessment failed, assuming material change: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return {
      materialChange: true,
      reason: `Assessment failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
