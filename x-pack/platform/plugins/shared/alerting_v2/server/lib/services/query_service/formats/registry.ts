/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { arrowFormat } from './arrow_format';
import { jsonFormat } from './json_format';
import type { EsqlResponseFormat } from './types';

/**
 * Every ES|QL response format the plugin supports. This tuple is the single
 * source of truth: the config schema, the query row limit and `QueryService`
 * all read from it, so registering a format here is the only wiring needed.
 */
const ESQL_RESPONSE_FORMATS = [jsonFormat, arrowFormat] as const;

/** Union of the registered format names, inferred from the registry. */
export type EsqlResponseFormatName = (typeof ESQL_RESPONSE_FORMATS)[number]['name'];

/** Names operators may set in `xpack.alerting_v2.esql.responseFormat`. */
export const ESQL_RESPONSE_FORMAT_NAMES: readonly EsqlResponseFormatName[] =
  ESQL_RESPONSE_FORMATS.map((format) => format.name);

export const DEFAULT_ESQL_RESPONSE_FORMAT: EsqlResponseFormatName = 'json';

/** Resolves a configured format name to its implementation. */
export const getEsqlResponseFormat = (name: EsqlResponseFormatName): EsqlResponseFormat => {
  const format = ESQL_RESPONSE_FORMATS.find((candidate) => candidate.name === name);

  if (!format) {
    throw new Error(`Unknown ES|QL response format: ${name}`);
  }

  return format;
};
