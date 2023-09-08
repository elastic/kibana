/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

export const mockIndicesGetMappingIndexMappingRecords: Record<
  string,
  IndicesGetMappingIndexMappingRecord
> = {
  'auditbeat-custom-index-1': {
    mappings: {
      properties: {
        '@timestamp': {
          type: 'date',
        },
        event: {
          properties: {
            category: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        host: {
          properties: {
            name: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
          },
        },
        some: {
          properties: {
            field: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
          },
        },
        source: {
          properties: {
            ip: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            port: {
              type: 'long',
            },
          },
        },
      },
    },
  },
};
