/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Shared by workflow and agent islands.
 * Captured effective config is plain JSON from toPlainConfig. Validating {}
 * applies schema defaults. Copying only string leaves drops numbers, booleans,
 * arrays, and optional objects. This helper restores ByteSizeValue and Duration
 * inputs, then validates the whole capture. */

import { duration as momentDuration } from 'moment';

const MAX_DEPTH = 30;

export interface PluginConfigSchema {
  validate: (raw: unknown, context?: object) => unknown;
}

const isByteSizePlain = (value: object): value is { valueInBytes: number } => {
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== 'valueInBytes') return false;
  return typeof (value as { valueInBytes?: unknown }).valueInBytes === 'number';
};

/** Moment Duration#toJSON is ISO-8601. schema.duration() rejects that form. */
const isoDurationMs = (value: string): number | null => {
  if (!value.startsWith('P')) return null;
  const parsed = momentDuration(value);
  if (parsed.toISOString() !== value) return null;
  const ms = parsed.asMilliseconds();
  if (!Number.isSafeInteger(ms) || ms < 0) return null;
  return ms;
};

/** Turns captured ByteSizeValue and ISO durations back into schema inputs. */
export const restoreSchemaInput = (value: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH) throw new Error('worker-core config reconstruction exceeded depth');
  if (typeof value === 'string') {
    const ms = isoDurationMs(value);
    return ms === null ? value : ms;
  }
  if (Array.isArray(value)) return value.map((item) => restoreSchemaInput(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  if (isByteSizePlain(value)) return value.valueInBytes;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined) continue;
    out[key] = restoreSchemaInput(child, depth + 1);
  }
  return out;
};

const missing = (pluginId: string): boolean =>
  typeof pluginId !== 'string' || pluginId.length === 0;

const hasKeys = (value: unknown): boolean =>
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;

/**
 * Validates one plugin's captured effective config through its owner schema.
 * A missing capture throws so schema defaults cannot replace configured values.
 * An empty object is accepted only when the schema itself has no fields
 * (`workflowsExtensions` is `schema.object({})`). A schema that fills defaults
 * still throws.
 */
export const reconstructPluginConfig = (
  pluginId: string,
  configSchema: PluginConfigSchema,
  capturedEffectiveConfig: unknown,
  context: object
): unknown => {
  if (missing(pluginId)) throw new Error('worker-core config reconstruction requires a plugin id');
  if (
    capturedEffectiveConfig === null ||
    capturedEffectiveConfig === undefined ||
    typeof capturedEffectiveConfig !== 'object' ||
    Array.isArray(capturedEffectiveConfig)
  ) {
    throw new Error(`worker-core config reconstruction missing for ${pluginId}`);
  }
  if (Object.keys(capturedEffectiveConfig).length === 0) {
    const validated = configSchema.validate({}, context);
    if (hasKeys(validated)) {
      throw new Error(`worker-core config reconstruction missing for ${pluginId}`);
    }
    return validated;
  }
  return configSchema.validate(restoreSchemaInput(capturedEffectiveConfig), context);
};
