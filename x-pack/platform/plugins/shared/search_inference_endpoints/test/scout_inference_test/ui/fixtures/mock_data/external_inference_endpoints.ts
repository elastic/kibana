/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const externalInferenceEndpointsMockData = [
  {
    inference_id: 'openai-chat-completion-01',
    task_type: 'chat_completion',
    service: 'openai',
    service_settings: { model_id: 'gpt-4o' },
  },
  {
    inference_id: 'openai-text-embedding-02',
    task_type: 'text_embedding',
    service: 'openai',
    service_settings: { model_id: 'text-embedding-3-small' },
  },
  {
    inference_id: 'cohere-rerank-03',
    task_type: 'rerank',
    service: 'cohere',
    service_settings: { model_id: 'rerank-v3' },
  },
  {
    inference_id: 'hugging-face-text-embedding-04',
    task_type: 'text_embedding',
    service: 'hugging_face',
    service_settings: { model_id: 'sentence-transformers/all-MiniLM-L6-v2' },
  },
];
