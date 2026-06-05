/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlTypeDefinition } from '../services/sml/types';

export const CORPUS_ENTRY_SML_TYPE = 'corpus_entry';

/**
 * Neutral SML type for ad-hoc / eval corpus documents written directly via the
 * `contextEngine.addEntry` workflow step (content-mode, `ingestion_method:
 * 'manual'`).
 *
 * It is intentionally registered by the Agent Context Layer host plugin rather
 * than a solution plugin: corpus entries (e.g. the BrowseComp-Plus eval corpus)
 * do not belong to any product surface, so this gives workflow authors a
 * non-solution-specific namespace to sink documents into for end-to-end tests.
 *
 * There is no crawler integration: `list` yields nothing and `getSmlData`
 * returns `undefined`, so the crawler never produces entries for this type
 * (writes only ever arrive through the workflow step's content-mode path, which
 * skips `getSmlData`). `toAttachment` returns `undefined` because a corpus entry
 * is searchable but does not resolve to a typed conversation attachment.
 */
export const corpusEntrySmlType: SmlTypeDefinition = {
  id: CORPUS_ENTRY_SML_TYPE,

  // No crawling: entries are written explicitly via contextEngine.addEntry.
  list: (_context) => ({
    [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true as const, value: [] }) }),
  }),

  // Content-mode writes supply chunks directly; getSmlData is never invoked.
  getSmlData: async () => undefined,

  // Corpus entries are searchable but not resolvable to a conversation attachment.
  toAttachment: async () => undefined,
};
