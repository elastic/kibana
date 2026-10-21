/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Shared by workflow and agent islands.
 * Captured effective config is plain JSON from toPlainConfig. Validating {}
 * applies schema defaults. Copying only string leaves drops numbers, booleans,
 * arrays, and optional objects. Duration and ByteSizeValue are restored only
 * where the owner schema says so. A string that merely looks like PT30S stays
 * a string in headers and allowedHosts. */

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

/** Config-schema node. Inner fields are the class members used to walk types. */
interface SchemaNode {
  readonly constructor: { name: string };
  getPropSchemas?: () => Record<string, SchemaNode>;
  readonly arrayType?: SchemaNode;
  readonly maybeType?: SchemaNode;
  readonly unionTypes?: readonly SchemaNode[];
  readonly equalType?: SchemaNode;
  readonly notEqualType?: SchemaNode;
  readonly valueType?: SchemaNode;
}

const schemaKind = (schema: SchemaNode | undefined): string => schema?.constructor?.name ?? '';

/**
 * Restores ByteSizeValue and moment Duration JSON only on schema nodes of those
 * types. Strings on every other node, including headers and host lists, stay
 * strings. Without a schema, nothing is converted.
 */
export const restoreSchemaInput = (value: unknown, schema?: SchemaNode, depth = 0): unknown => {
  if (depth > MAX_DEPTH) throw new Error('worker-core config reconstruction exceeded depth');
  if (!schema) return value;
  const kind = schemaKind(schema);
  if (kind === 'DurationType') {
    if (typeof value !== 'string') return value;
    const ms = isoDurationMs(value);
    return ms === null ? value : ms;
  }
  if (kind === 'ByteSizeType') {
    if (value && typeof value === 'object' && isByteSizePlain(value)) return value.valueInBytes;
    return value;
  }
  if (kind === 'MaybeType' && schema.maybeType) {
    if (value === undefined || value === null) return value;
    return restoreSchemaInput(value, schema.maybeType, depth + 1);
  }
  if (kind === 'ArrayType' && schema.arrayType && Array.isArray(value)) {
    return value.map((item) => restoreSchemaInput(item, schema.arrayType, depth + 1));
  }
  if (
    kind === 'RecordOfType' &&
    schema.valueType &&
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = restoreSchemaInput(child, schema.valueType, depth + 1);
    }
    return out;
  }
  if (kind === 'UnionType' && schema.unionTypes) {
    const durationOnly = schema.unionTypes.every((alternative) => schemaKind(alternative) === 'DurationType');
    if (durationOnly && schema.unionTypes[0]) {
      return restoreSchemaInput(value, schema.unionTypes[0], depth + 1);
    }
    return value;
  }
  if (kind === 'ConditionalType' && schema.equalType && schema.notEqualType) {
    if (schemaKind(schema.equalType) === schemaKind(schema.notEqualType)) {
      return restoreSchemaInput(value, schema.equalType, depth + 1);
    }
    return value;
  }
  if (
    kind === 'ObjectType' &&
    schema.getPropSchemas &&
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    const props = schema.getPropSchemas();
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (child === undefined) continue;
      const childSchema = props[key];
      out[key] = childSchema ? restoreSchemaInput(child, childSchema, depth + 1) : child;
    }
    return out;
  }
  return value;
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
  return configSchema.validate(
    restoreSchemaInput(capturedEffectiveConfig, configSchema as SchemaNode),
    context
  );
};
