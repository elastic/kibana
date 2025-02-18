/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterComponentTemplate } from '@elastic/elasticsearch/lib/api/types';
import { AI_ASSISTANT_KB_INFERENCE_ID } from './inference_endpoint';

const keyword = {
  type: 'keyword' as const,
  ignore_above: 1024,
};

const text = {
  type: 'text' as const,
};

const date = {
  type: 'date' as const,
};

const dynamic = {
  type: 'object' as const,
  dynamic: true,
};

export const kbComponentTemplate: ClusterComponentTemplate['component_template']['template'] = {
  mappings: {
    dynamic: false,
    properties: {
      '@timestamp': date,
      id: keyword,
      doc_id: { type: 'text', fielddata: true }, // deprecated but kept for backwards compatibility
      title: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      user: {
        properties: {
          id: keyword,
          name: keyword,
        },
      },
      type: keyword,
      labels: dynamic,
      conversation: {
        properties: {
          id: keyword,
          title: text,
          last_updated: date,
        },
      },
      namespace: keyword,
      text,
      semantic_text: {
        type: 'semantic_text',
        inference_id: AI_ASSISTANT_KB_INFERENCE_ID,
      },
      'ml.tokens': {
        type: 'rank_features',
      },
      confidence: keyword,
      is_correction: {
        type: 'boolean',
      },
      public: {
        type: 'boolean',
      },
    },
  },
};
