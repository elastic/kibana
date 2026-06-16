/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VegaDialect } from '@kbn/agent-builder-dashboards-common';
import {
  CREATE_VEGA_VISUALIZATION_FAILURE_TYPES,
  type CreateVegaVisualizationFailure,
} from './failure_types';

const VEGA_LITE_SCHEMA_URL_REGEX =
  /^https?:\/\/vega\.github\.io\/schema\/vega-lite\/v\d+(?:\.\d+)*\.json$/i;
const VEGA_SCHEMA_URL_REGEX = /^https?:\/\/vega\.github\.io\/schema\/vega\/v\d+(?:\.\d+)*\.json$/i;

const detectDialect = (specSchema: unknown): VegaDialect | undefined => {
  if (typeof specSchema !== 'string') {
    return undefined;
  }
  if (VEGA_LITE_SCHEMA_URL_REGEX.test(specSchema)) {
    return 'vega-lite';
  }
  if (VEGA_SCHEMA_URL_REGEX.test(specSchema)) {
    return 'vega';
  }
  return undefined;
};

export interface ValidateSpecSuccess {
  ok: true;
  spec: Record<string, unknown>;
  dialect: VegaDialect;
}

export interface ValidateSpecFailure {
  ok: false;
  failure: CreateVegaVisualizationFailure;
}

export type ValidateSpecResult = ValidateSpecSuccess | ValidateSpecFailure;

/**
 * Validate a Vega / Vega-Lite spec submitted as a JSON string.
 *
 * The tool deliberately does NOT do deep JSON-Schema validation against the
 * official Vega / Vega-Lite schemas: those schemas do not model Kibana's
 * `%type%: "esql"` URL extension and would reject any spec that uses it.
 * Deep grammar issues are surfaced by the Vega runtime at render time.
 *
 * Validation here is limited to:
 * 1. JSON parse.
 * 2. Object-shape check.
 * 3. Dialect detection from `$schema`.
 */
export const validateSpec = (rawSpec: string): ValidateSpecResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawSpec);
  } catch (error) {
    return {
      ok: false,
      failure: {
        type: CREATE_VEGA_VISUALIZATION_FAILURE_TYPES.invalidJson,
        message: `Spec is not valid JSON: ${
          error instanceof Error ? error.message : String(error)
        }. The spec must be a JSON-encoded Vega or Vega-Lite document; HJSON or triple-quoted strings are not supported.`,
      },
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      failure: {
        type: CREATE_VEGA_VISUALIZATION_FAILURE_TYPES.invalidJson,
        message: 'Spec must be a JSON object.',
      },
    };
  }

  const specObject = parsed as Record<string, unknown>;
  const dialect = detectDialect(specObject.$schema);
  if (!dialect) {
    return {
      ok: false,
      failure: {
        type: CREATE_VEGA_VISUALIZATION_FAILURE_TYPES.missingSchema,
        message:
          'Spec is missing a recognized `$schema` URL. Set `$schema` to one of:\n' +
          '  - https://vega.github.io/schema/vega-lite/v6.json\n' +
          '  - https://vega.github.io/schema/vega/v6.json',
      },
    };
  }

  return { ok: true, spec: specObject, dialect };
};
