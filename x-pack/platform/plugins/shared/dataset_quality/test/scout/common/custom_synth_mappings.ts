/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

/**
 * Declares 25 fields, counting leaves, the objects holding them and multi-fields,
 * so the "field limit exceeded" root-cause assertions stay deterministic. Callers
 * set `mapping.total_fields.limit` relative to that count.
 *
 * A data stream composing this template resolves to more, because `logs@mappings`
 * and `ecs@mappings` contribute the rest — which is why the analyze endpoint
 * reports 28 in api/tests/degraded_field_analyze.spec.ts.
 *
 * The `data_stream.dataset` value below is inert: consumers compose this
 * template before `logs@mappings`, which redefines the field and wins.
 */
export const logsSynthMappings = (): MappingTypeMapping => ({
  properties: {
    '@timestamp': {
      type: 'date',
      ignore_malformed: false,
    },
    data_stream: {
      properties: {
        dataset: {
          type: 'constant_keyword',
          value: 'degraded.dataset.rca',
        },
        namespace: {
          type: 'constant_keyword',
          value: 'default',
        },
        type: {
          type: 'constant_keyword',
          value: 'logs',
        },
      },
    },
    event: {
      properties: {
        dataset: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    host: {
      properties: {
        name: {
          type: 'keyword',
          fields: {
            text: {
              type: 'match_only_text',
            },
          },
        },
      },
    },
    input: {
      properties: {
        type: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    log: {
      properties: {
        level: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    message: {
      type: 'match_only_text',
    },
    network: {
      properties: {
        bytes: {
          type: 'long',
        },
      },
    },
    service: {
      properties: {
        name: {
          type: 'keyword',
          fields: {
            text: {
              type: 'match_only_text',
            },
          },
        },
      },
    },
    test_field: {
      type: 'keyword',
      ignore_above: 1024,
    },
    tls: {
      properties: {
        established: {
          type: 'boolean',
        },
      },
    },
    trace: {
      properties: {
        id: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
  },
});

/**
 * Adds a `long` field so a document carrying a non-numeric value for it is
 * rejected as malformed, driving the "field malformed" root-cause assertions.
 */
export const logsSynthMalformedMappings = (): MappingTypeMapping => ({
  properties: {
    ...logsSynthMappings().properties,
    numeric_field: {
      type: 'long',
    },
  },
});
