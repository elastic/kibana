/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Max length for the custom field description
 */
export const MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH = 300;

export const MAX_SELECTABLE_SOURCE_FIELDS = 5;
export const MAX_SELECTABLE_GROUP_BY_TERMS = 4;
export const ES_QUERY_MAX_HITS_PER_EXECUTION = 10000;
export const MAX_GROUPS = 1000;

/**
 * Input limits for the APM rule params. Service names, transaction types and environments are ECS
 * keyword fields indexed with `ignore_above: 1024`, so longer values can never match a document.
 * Transaction names come from `_source` (the UI links to them as-is), so they get a higher bound.
 */
export const MAX_APM_FIELD_VALUE_LENGTH = 1024;
export const MAX_APM_DOCUMENT_VALUE_LENGTH = 10_000;
export const MAX_TIME_WINDOW_UNIT_LENGTH = 10;
export const MAX_SEARCH_QUERY_LENGTH = 10_000;
export const MAX_QUERY_LANGUAGE_LENGTH = 64;
export const MAX_APM_GROUP_BY_FIELDS = 10;

export enum Comparator {
  GT = '>',
  LT = '<',
  GT_OR_EQ = '>=',
  LT_OR_EQ = '<=',
  BETWEEN = 'between',
  NOT_BETWEEN = 'notBetween',
}

/**
 * All runtime field types.
 * @public
 */
export const RUNTIME_FIELD_TYPES = [
  'keyword',
  'long',
  'double',
  'date',
  'ip',
  'boolean',
  'geo_point',
  'composite',
] as const;

export const RUNTIME_FIELD_TYPES2 = [
  'keyword',
  'long',
  'double',
  'date',
  'ip',
  'boolean',
  'geo_point',
] as const;
