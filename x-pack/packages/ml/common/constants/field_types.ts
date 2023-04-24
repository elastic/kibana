/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ML_JOB_FIELD_TYPES = {
  BOOLEAN: 'boolean',
  DATE: 'date',
  GEO_POINT: 'geo_point',
  GEO_SHAPE: 'geo_shape',
  IP: 'ip',
  KEYWORD: 'keyword',
  NUMBER: 'number',
  TEXT: 'text',
  UNKNOWN: 'unknown',
} as const;

export const MLCATEGORY = 'mlcategory';

/**
 * For use as summary_count_field_name in datafeeds which use aggregations.
 */
export const DOC_COUNT = 'doc_count';

/**
 * Elasticsearch field showing number of documents aggregated in a single summary field for
 * pre-aggregated data. For use as summary_count_field_name in datafeeds which do not use aggregations.
 */
export const _DOC_COUNT = '_doc_count';

// List of system fields we don't want to display.
export const OMIT_FIELDS: string[] = ['_source', '_type', '_index', '_id', '_version', '_score'];
