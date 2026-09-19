/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ILLEGAL_CHARACTERS } from '@kbn/data-view-validation';
import {
  DEFAULT_MAX_PATTERNS,
  MAX_KQL_FILTER_LENGTH,
  MAX_NL_QUERY_LENGTH,
  MAX_PATTERNS,
  MAX_TARGET_LENGTH,
} from './constants';

/**
 * ES|QL sources are not parameterizable: `esql.from(target)` interpolates the string verbatim,
 * so a target containing `|` or a space injects commands into the query. `ILLEGAL_CHARACTERS`
 * from `@kbn/data-view-validation` is the authoritative list of disallowed characters (includes
 * `\`, `/`, `?`, `"`, `<`, `>`, `|`, and space).
 *
 * Note: date-math index names such as `<logs-{now/d}>` are also rejected because they contain
 * `<`, `>`, and `/`. Kibana data views reject them for the same reason, and ES|QL `FROM` does
 * not accept them unquoted.
 */
const isSafeIndexPattern = (target: string): boolean =>
  !ILLEGAL_CHARACTERS.some((char) => target.includes(char));

/**
 * Runtime schema for the serializable subset of {@link SemanticLogSearchParams}.
 *
 * `esClient` and `abortSignal` are not parseable and must be re-attached by the caller after
 * validating with this schema. Using `validation.data` (not just `validation.success`) is
 * essential — zod's `.trim()` and `.default()` coercions only apply when you consume the output.
 */
export const semanticLogSearchInputSchema = z.object({
  target: z.string().trim().min(1).max(MAX_TARGET_LENGTH).refine(isSafeIndexPattern, {
    message:
      'target must be a plain index pattern — characters \\ / ? " < > | and spaces are not allowed',
  }),
  nlQuery: z.string().trim().min(1).max(MAX_NL_QUERY_LENGTH),
  timeRange: z
    .object({
      start: z.number().int(),
      end: z.number().int(),
    })
    .refine(({ start, end }) => start < end, {
      message: 'timeRange.start must be before timeRange.end',
    }),
  maxPatterns: z.number().int().min(1).max(MAX_PATTERNS).default(DEFAULT_MAX_PATTERNS),
  kqlFilter: z.string().max(MAX_KQL_FILTER_LENGTH).optional(),
});
