/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUB_ACTION } from '@kbn/connector-schemas/inference/constants';

export const DEFAULT_CHAT_COMPLETE_BODY = {
  input: 'What is Elastic?',
};

export const DEFAULT_RERANK_BODY = {
  input: ['luke', 'like', 'leia', 'chewy', 'r2d2', 'star', 'wars'],
  query: 'star wars main character',
};

export const DEFAULT_SPARSE_EMBEDDING_BODY = {
  input: 'The sky above the port was the color of television tuned to a dead channel.',
};

export const DEFAULT_TEXT_EMBEDDING_BODY = {
  input: 'The sky above the port was the color of television tuned to a dead channel.',
  inputType: 'ingest',
};

export const DEFAULT_UNIFIED_CHAT_COMPLETE_BODY = {
  body: {
    messages: [
      {
        role: 'user',
        content: 'Hello world',
      },
    ],
  },
};

export const DEFAULTS_BY_TASK_TYPE: Record<string, unknown> = {
  [SUB_ACTION.COMPLETION]: DEFAULT_CHAT_COMPLETE_BODY,
  [SUB_ACTION.UNIFIED_COMPLETION]: DEFAULT_UNIFIED_CHAT_COMPLETE_BODY,
  [SUB_ACTION.UNIFIED_COMPLETION_STREAM]: DEFAULT_UNIFIED_CHAT_COMPLETE_BODY,
  [SUB_ACTION.UNIFIED_COMPLETION_ASYNC_ITERATOR]: DEFAULT_UNIFIED_CHAT_COMPLETE_BODY,
  [SUB_ACTION.RERANK]: DEFAULT_RERANK_BODY,
  [SUB_ACTION.SPARSE_EMBEDDING]: DEFAULT_SPARSE_EMBEDDING_BODY,
  [SUB_ACTION.TEXT_EMBEDDING]: DEFAULT_TEXT_EMBEDDING_BODY,
};

export const DEFAULT_TASK_TYPE = 'unified_completion';

export const DEFAULT_PROVIDER = 'elasticsearch';
