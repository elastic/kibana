/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';

/**
 * Stable, globally-unique identifier for a knowledge indicator row.
 *
 * Identity in the unified data stream is `(stream.name, type, id)` — the bare
 * `id` is only unique within a single stream, so it must be qualified by the
 * stream name (and kind). Using `id` alone collides across streams in the
 * multi-stream table, producing duplicated/ghost rows on re-render and broken
 * selection/expansion state.
 */
export const getKnowledgeIndicatorItemId = (knowledgeIndicator: KnowledgeIndicator): string => {
  const localId =
    knowledgeIndicator.kind === 'feature'
      ? knowledgeIndicator.feature.id
      : knowledgeIndicator.query.id;
  return `${knowledgeIndicator.stream_name}:${knowledgeIndicator.kind}:${localId}`;
};
