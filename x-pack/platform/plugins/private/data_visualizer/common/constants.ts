/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';

export const APP_ID = 'data_visualizer';

export const SUPPORTED_FIELD_TYPES = {
  BOOLEAN: 'boolean',
  CONFLICT: 'conflict',
  DATE: 'date',
  DATE_RANGE: 'date_range',
  GEO_POINT: 'geo_point',
  GEO_SHAPE: 'geo_shape',
  HISTOGRAM: 'histogram',
  IP: 'ip',
  IP_RANGE: 'ip_range',
  KEYWORD: 'keyword',
  MURMUR3: 'murmur3',
  NUMBER: 'number',
  NESTED: 'nested',
  STRING: 'string',
  TEXT: 'text',
  SEMANTIC_TEXT: 'semantic_text',
  DENSE_VECTOR: 'dense_vector',
  SPARSE_VECTOR: 'sparse_vector',
  VERSION: 'version',
  UNKNOWN: 'unknown',
} as const;

export const OMIT_FIELDS: string[] = [
  '_source',
  '_type',
  '_index',
  '_id',
  '_version',
  '_score',
  '_tier',
  '_ignored',
];

export const NON_AGGREGATABLE_FIELD_TYPES = new Set<string>([
  KBN_FIELD_TYPES.GEO_SHAPE,
  KBN_FIELD_TYPES.HISTOGRAM,
]);

export const FILE_DATA_VIS_TAB_ID = 'fileDataViz';
export const applicationPath = `/app/home#/tutorial_directory/${FILE_DATA_VIS_TAB_ID}`;
export const featureTitle = i18n.translate('xpack.dataVisualizer.title', {
  defaultMessage: 'Upload a file',
});
export const featureId = `file_data_visualizer`;
export const SUPPORTED_FIELD_TYPES_LIST: string[] = Object.values(SUPPORTED_FIELD_TYPES);
