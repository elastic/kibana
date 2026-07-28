/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';
import {
  deriveKnowledgeIndicatorSource,
  type KnowledgeIndicatorSource,
} from '@kbn/significant-events-schema';

/**
 * Resolves a KI's evidence source(s). Prefers the
 * server-computed `source` field, falling back to deriving it from the
 * `evidence` lines for older documents.
 */
export const getKnowledgeIndicatorSource = (ki: KnowledgeIndicator): KnowledgeIndicatorSource[] => {
  if (ki.kind === 'feature') {
    return ki.feature.source ?? deriveKnowledgeIndicatorSource(ki.feature.evidence);
  }
  return ki.query.source ?? deriveKnowledgeIndicatorSource(ki.query.evidence);
};

export type KnowledgeIndicatorSourceDisplayKind = 'code' | 'logs' | 'both';

export const sourceDisplayKind = (
  source: KnowledgeIndicatorSource[]
): KnowledgeIndicatorSourceDisplayKind => {
  if (source.length > 1) {
    return 'both';
  }
  return source[0] ?? 'logs';
};
