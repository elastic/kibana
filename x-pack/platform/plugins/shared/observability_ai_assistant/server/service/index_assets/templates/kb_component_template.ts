/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterComponentTemplate } from '@elastic/elasticsearch/lib/api/types';

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

export function getComponentTemplate(inferenceId: string) {
  const kbComponentTemplate: ClusterComponentTemplate['component_template']['template'] = {
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
          inference_id: inferenceId,
        },
        'ml.tokens': {
          type: 'rank_features',
        },
        confidence: keyword, // deprecated but kept for backwards compatibility
        is_correction: {
          // deprecated but kept for backwards compatibility
          type: 'boolean',
        },
        public: {
          type: 'boolean',
        },
      },
    },
  };

  return kbComponentTemplate;
}
