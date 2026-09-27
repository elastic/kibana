/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  DEFAULT_MAX_PATTERNS,
  MAX_EPOCH_MS,
  MAX_KQL_FILTER_LENGTH,
  MAX_NL_QUERY_LENGTH,
  MAX_PATTERNS,
  MAX_TARGET_LENGTH,
} from './constants';

// `esql.from()` interpolates its argument unquoted, so `target` must be restricted to characters
// that cannot alter the shape of the FROM clause. Derived from the ES|QL lexer's
// `UNQUOTED_SOURCE_PART` fragment, and deliberately narrower — `,` and `:` are kept for
// multi-target and cluster-prefixed patterns; `|` is excluded as the command separator; `/`,
// `\ ? " < > #` and non-ASCII are legal there but invalid in Elasticsearch index names.
// https://github.com/elastic/elasticsearch/blob/67ee2d4c668d04a9b99960773c269530fcd739c5/x-pack/plugin/esql/src/main/antlr/lexer/From.g4#L33-L36
const INDEX_PATTERN = /^[a-zA-Z0-9_.,:*+-]+$/;

/**
 * Runtime schema for the serializable subset of {@link SemanticLogSearchParams}.
 *
 * `esClient` and `abortSignal` are not parseable and must be re-attached by the caller after
 * validating with this schema. Consume `validation.data`, not just check `validation.success` —
 * zod's `.trim()` and `.default()` coercions only apply to the parsed output, not the raw input.
 */
export const semanticLogSearchInputSchema = z.object({
  target: z.string().trim().min(1).max(MAX_TARGET_LENGTH).regex(INDEX_PATTERN, {
    message:
      'target must be a plain index pattern — only alphanumeric characters, dots, underscores, hyphens, colons, commas, asterisks, and plus signs are allowed',
  }),
  nlQuery: z.string().trim().min(1).max(MAX_NL_QUERY_LENGTH),
  timeRange: z
    .object({
      start: z.number().int().min(-MAX_EPOCH_MS).max(MAX_EPOCH_MS),
      end: z.number().int().min(-MAX_EPOCH_MS).max(MAX_EPOCH_MS),
    })
    .refine(({ start, end }) => start < end, {
      message: 'timeRange.start must be before timeRange.end',
    }),
  maxPatterns: z.number().int().min(1).max(MAX_PATTERNS).default(DEFAULT_MAX_PATTERNS),
  kqlFilter: z.string().max(MAX_KQL_FILTER_LENGTH).optional(),
});
