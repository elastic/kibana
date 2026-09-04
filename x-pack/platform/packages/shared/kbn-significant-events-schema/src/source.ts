/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * The evidence source(s) a Knowledge Indicator was derived from:
 * - `code`: derived from source code.
 * - `logs`: derived from log/data analysis (the historical default).
 */
export type KnowledgeIndicatorSource = 'code' | 'logs';

export const knowledgeIndicatorSourceSchema = z.enum(['code', 'logs']);
export const knowledgeIndicatorSourceArraySchema = z.array(knowledgeIndicatorSourceSchema);

/** Evidence lines derived from source code are prefixed with `code:`. */
export const CODE_EVIDENCE_PREFIX = 'code:';

/**
 * Derives a KI's source from its `evidence` lines. Code-grounded evidence is
 * prefixed with `code:` (see the significant events pipeline); everything else
 * is treated as log-derived. Defaults to `['logs']` when there is no evidence,
 * matching the historical (logs-only) behavior.
 */
export function deriveKnowledgeIndicatorSource(evidence?: string[]): KnowledgeIndicatorSource[] {
  const lines = evidence ?? [];
  const hasCode = lines.some((line) => line.trimStart().startsWith(CODE_EVIDENCE_PREFIX));
  const hasLog = lines.some((line) => !line.trimStart().startsWith(CODE_EVIDENCE_PREFIX));
  if (hasCode && hasLog) return ['code', 'logs'];
  return hasCode ? ['code'] : ['logs'];
}
