/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  DEFAULT_MAX_PATTERNS,
  MAX_KQL_FILTER_LENGTH,
  MAX_NL_QUERY_LENGTH,
  MAX_PATTERNS,
  MAX_TARGET_LENGTH,
} from './constants';

/**
 * `esql.from(target)` interpolates its argument verbatim: `Builder.expression.source.node`
 * hardcodes `{ unquoted: true }` for string inputs, and `LeafPrinter.string` short-circuits all
 * escaping on that flag. So `target` must be constrained to characters that cannot alter the
 * shape of the FROM clause.
 *
 * Derived from the ES|QL lexer's `fragment UNQUOTED_SOURCE_PART : ~[:"=|,[\]/() \t\r\n]`, which
 * is the authoritative definition of what stays inside a single source token. Every character
 * below is either inside that class, or is one of the two structural characters we deliberately
 * allow:
 *   `,` separates sources (`FROM a,b` parses as two sources)
 *   `:` introduces a cluster prefix or a `::data` / `::failures` selector
 * Neither can start a new command — only `|` can, and `|` is excluded.
 *
 * Deliberately narrower than the grammar: `\ ? " < > #` and non-ASCII are all legal ES|QL source
 * characters but illegal in Elasticsearch index names, so excluding them costs nothing.
 *
 * Known limitation: date-math index names (`<logs-{now/d}>`) are rejected. Kibana data views
 * reject them too, and ES|QL `FROM` does not accept them unquoted.
 *
 * See schema.test.ts for a parser-pinned property test that asserts any target passing this
 * rule cannot change the shape of the emitted FROM clause.
 */
const INDEX_PATTERN = /^[a-zA-Z0-9_.,:*+-]+$/;

/**
 * Runtime schema for the serializable subset of {@link SemanticLogSearchParams}.
 *
 * `esClient` and `abortSignal` are not parseable and must be re-attached by the caller after
 * validating with this schema. Using `validation.data` (not just `validation.success`) is
 * essential — zod's `.trim()` and `.default()` coercions only apply when you consume the output.
 */
export const semanticLogSearchInputSchema = z.object({
  target: z.string().trim().min(1).max(MAX_TARGET_LENGTH).regex(INDEX_PATTERN, {
    message:
      'target must be a plain index pattern — only alphanumeric characters, dots, underscores, hyphens, colons, commas, asterisks, and plus signs are allowed',
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
