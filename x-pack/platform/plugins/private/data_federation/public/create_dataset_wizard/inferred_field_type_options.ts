/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mirrors `MAIN_TYPES` from index management mappings editor so the prototype
 * exposes the same mapping type choices as the index template / mappings UI.
 */
export const INDEX_MANAGEMENT_MAIN_FIELD_TYPES = [
  'alias',
  'binary',
  'boolean',
  'completion',
  'constant_keyword',
  'date',
  'date_nanos',
  'dense_vector',
  'flattened',
  'geo_point',
  'geo_shape',
  'histogram',
  'ip',
  'join',
  'keyword',
  'match_only_text',
  'nested',
  'numeric',
  'object',
  'other',
  'percolator',
  'point',
  'range',
  'rank_feature',
  'rank_features',
  'search_as_you_type',
  'semantic_text',
  'shape',
  'sparse_vector',
  'text',
  'token_count',
  'version',
  'wildcard',
] as const;

/** Concrete types returned by automatic inference that are not top-level MAIN types. */
export const INFERRED_CONCRETE_FIELD_TYPES = [
  'double',
  'float',
  'half_float',
  'integer',
  'long',
  'scaled_float',
  'short',
] as const;

export const INFERRED_FIELD_TYPE_OPTIONS = [
  ...new Set([...INDEX_MANAGEMENT_MAIN_FIELD_TYPES, ...INFERRED_CONCRETE_FIELD_TYPES]),
].sort((left, right) => left.localeCompare(right));

export type InferredFieldTypeOption = (typeof INFERRED_FIELD_TYPE_OPTIONS)[number];

export const isInferredFieldTypeOption = (value: string): value is InferredFieldTypeOption =>
  INFERRED_FIELD_TYPE_OPTIONS.includes(value as InferredFieldTypeOption);

export const formatInferredFieldTypeLabel = (type: string): string => {
  switch (type) {
    case 'date_nanos':
      return 'date nanos';
    case 'half_float':
      return 'half float';
    case 'scaled_float':
      return 'scaled float';
    case 'match_only_text':
      return 'match only text';
    case 'search_as_you_type':
      return 'search as you type';
    case 'semantic_text':
      return 'semantic text';
    case 'constant_keyword':
      return 'constant keyword';
    case 'dense_vector':
      return 'dense vector';
    case 'sparse_vector':
      return 'sparse vector';
    case 'geo_point':
      return 'geo point';
    case 'geo_shape':
      return 'geo shape';
    case 'rank_feature':
      return 'rank feature';
    case 'rank_features':
      return 'rank features';
    case 'token_count':
      return 'token count';
    default:
      return type.replaceAll('_', ' ');
  }
};

export const getEffectiveAutomaticFieldType = ({
  fieldName,
  inferredType,
  overrides,
}: {
  fieldName: string;
  inferredType: string;
  overrides: Record<string, string>;
}): string => overrides[fieldName] ?? inferredType;

export const pruneAutomaticFieldTypeOverrides = (
  overrides: Record<string, string>,
  fieldNames: readonly string[]
): Record<string, string> => {
  const allowedNames = new Set(fieldNames);
  const nextOverrides: Record<string, string> = {};

  for (const [fieldName, fieldType] of Object.entries(overrides)) {
    if (allowedNames.has(fieldName)) {
      nextOverrides[fieldName] = fieldType;
    }
  }

  return nextOverrides;
};

export const applyAutomaticFieldTypeOverride = ({
  overrides,
  fieldName,
  inferredType,
  nextType,
}: {
  overrides: Record<string, string>;
  fieldName: string;
  inferredType: string;
  nextType: string;
}): Record<string, string> => {
  const nextOverrides = { ...overrides };

  if (nextType === inferredType) {
    delete nextOverrides[fieldName];
  } else {
    nextOverrides[fieldName] = nextType;
  }

  return nextOverrides;
};

export const isAutomaticFieldTypeOverridden = (
  overrides: Record<string, string>,
  fieldName: string
): boolean => Object.prototype.hasOwnProperty.call(overrides, fieldName);
