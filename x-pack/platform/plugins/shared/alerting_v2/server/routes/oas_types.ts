/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Minimal OpenAPI operation shape used by the Alerting v2 OAS example helpers. */
export interface AlertingOasOperationObject {
  requestBody?: {
    content?: {
      'application/json'?: {
        examples?: Record<string, { summary?: string; value?: unknown }>;
      };
    };
  };
  responses?: Record<
    string,
    {
      content?: {
        'application/json'?: {
          examples?: Record<string, { summary?: string; value?: unknown }>;
        };
      };
    }
  >;
}

/** A single named OAS example (request body or response). */
export interface OasExampleEntry {
  name: string;
  summary: string;
  value: unknown;
}
