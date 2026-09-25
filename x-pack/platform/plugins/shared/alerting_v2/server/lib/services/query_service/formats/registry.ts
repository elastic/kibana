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

/**
 * Format used whenever the `alertingV2.esqlResponseFormat` feature flag cannot
 * be resolved to a registered format — no provider attached, a blocked network,
 * or an unknown variation. Must stay the safest transport, because every
 * deployment without an explicit rollout runs on it.
 */
export const DEFAULT_ESQL_RESPONSE_FORMAT: EsqlResponseFormat = jsonFormat;

/**
 * Resolves a format by name, or `undefined` when the name is not registered.
 * Names come from a feature flag, whose values are not schema-validated, so an
 * unknown name has to be a recoverable miss rather than a throw that would
 * fail every rule execution.
 */
export const findEsqlResponseFormat = (name: string): EsqlResponseFormat | undefined =>
  ESQL_RESPONSE_FORMATS.find((candidate) => candidate.name === name);
