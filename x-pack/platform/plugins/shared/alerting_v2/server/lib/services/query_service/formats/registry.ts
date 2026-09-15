/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { arrowFormat } from './arrow_format';
import { jsonFormat } from './json_format';
import type { EsqlResponseFormat } from './types';

const ESQL_RESPONSE_FORMATS = [jsonFormat, arrowFormat] as const;

export type EsqlResponseFormatName = (typeof ESQL_RESPONSE_FORMATS)[number]['name'];

export const ESQL_RESPONSE_FORMAT_NAMES: readonly EsqlResponseFormatName[] =
  ESQL_RESPONSE_FORMATS.map((format) => format.name);

export const DEFAULT_ESQL_RESPONSE_FORMAT: EsqlResponseFormatName = 'json';

export const getEsqlResponseFormat = (name: EsqlResponseFormatName): EsqlResponseFormat => {
  const format = ESQL_RESPONSE_FORMATS.find((candidate) => candidate.name === name);

  if (!format) {
    throw new Error(`Unknown ES|QL response format: ${name}`);
  }

  return format;
};
