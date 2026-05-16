/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Standard error response shape returned by every alerting v2 route handler.
 *
 * Modeled on Geewax, *API Design Patterns*, Chapter 10 §10.3.4 ("Error handling")
 * with field naming aligned to the Kibana API guidelines:
 *
 * - `code`    — the contract. A stable, machine-readable identifier (e.g.
 *               `RULE_NOT_FOUND`, `INVALID_SCHEDULE`). Clients branch on this.
 *               Changing this value is a breaking change.
 * - `error`   — short category label (e.g. `Not Found`, `Bad Request`). For
 *               display and logs.
 * - `message` — human-friendly explanation. NOT part of the contract — can be
 *               rephrased, localized, or have typos fixed without breaking
 *               clients. Do not parse this field in client code.
 * - `details` — optional structured context (e.g. the resource id that
 *               conflicted, per-field validation issues).
 *
 * Note: the response intentionally omits a redundant `statusCode` body field
 * (the HTTP status line is the source of truth) and omits `ok: false` (any
 * non-2xx status already signals failure).
 */
export const errorResponseSchema = z.object({
  code: z
    .string()
    .describe(
      'A stable, machine-readable error code (e.g., "RULE_NOT_FOUND", "INVALID_SCHEDULE"). Safe for clients to branch on.'
    ),
  error: z
    .string()
    .describe(
      'A short human-readable summary of the error category (e.g., "Not Found", "Bad Request").'
    ),
  message: z
    .string()
    .describe(
      'A human-friendly explanation of the error. NOT part of the API contract — do not parse.'
    ),
  details: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Optional structured context (e.g., validation field errors, conflict resource IDs).'
    ),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
