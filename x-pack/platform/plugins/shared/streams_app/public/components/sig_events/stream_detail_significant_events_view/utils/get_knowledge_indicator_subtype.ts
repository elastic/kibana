/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';

/**
 * Returns the subtype of a KI, or undefined if it has none.
 * Only feature KIs carry a subtype; query KIs never do.
 */
export const getKnowledgeIndicatorSubtype = (ki: KnowledgeIndicator): string | undefined => {
  if (ki.kind === 'feature') return ki.feature.subtype ?? undefined;
  return undefined;
};
