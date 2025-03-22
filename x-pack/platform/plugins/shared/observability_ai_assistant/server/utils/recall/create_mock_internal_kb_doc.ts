/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KnowledgeBaseHit,
  KnowledgeBaseSourceInternal,
} from '../../service/knowledge_base_service/types';

export function createMockInternalKbDoc({
  id,
  text,
  score,
}: {
  id: string;
  text: string;
  score: number;
}): KnowledgeBaseHit<KnowledgeBaseSourceInternal> {
  return {
    document: {},
    id,
    score,
    text,
    title: '',
    source: {
      internal: {},
    },
  };
}
