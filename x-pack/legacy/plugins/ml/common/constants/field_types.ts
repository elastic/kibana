/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum ES_FIELD_TYPES {
  ATTACHMENT = 'attachment',
  BOOLEAN = 'boolean',
  BYTE = 'byte',
  DATE = 'date',
  DOUBLE = 'double',
  FLOAT = 'float',
  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',
  HALF_FLOAT = 'half_float',
  INTEGER = 'integer',
  IP = 'ip',
  KEYWORD = 'keyword',
  LONG = 'long',
  MURMUR3 = 'murmur3',
  SCALED_FLOAT = 'scaled_float',
  SHORT = 'short',
  TEXT = 'text',
  TOKEN_COUNT = 'token_count',
  _ID = '_id',
  _SOURCE = '_source',
  _TYPE = '_type',
}

export enum KBN_FIELD_TYPES {
  ATTACHMENT = 'attachment',
  BOOLEAN = 'boolean',
  DATE = 'date',
  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',
  IP = 'ip',
  MURMUR3 = 'murmur3',
  NUMBER = 'number',
  STRING = 'string',
  _SOURCE = '_source',
  UNKNOWN = 'unknown',
  CONFLICT = 'conflict',
}

export enum ML_JOB_FIELD_TYPES {
  BOOLEAN = 'boolean',
  DATE = 'date',
  GEO_POINT = 'geo_point',
  IP = 'ip',
  KEYWORD = 'keyword',
  NUMBER = 'number',
  TEXT = 'text',
  UNKNOWN = 'unknown',
}
