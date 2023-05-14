/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PatternRollup } from '../../types';

/**
 * This `PatternRollup` containing the following indices:
 * ```
 * .ds-auditbeat-8.6.1-2023.02.07-000001
 * auditbeat-custom-empty-index-1
 * auditbeat-custom-index-1
 * ```
 * has no `results`, because the indices were NOT checked
 */
export const auditbeatNoResults: PatternRollup = {
  docsCount: 19127,
  error: null,
  ilmExplain: {
    '.ds-auditbeat-8.6.1-2023.02.07-000001': {
      index: '.ds-auditbeat-8.6.1-2023.02.07-000001',
      managed: true,
      policy: 'auditbeat',
      phase: 'hot',
    },
    'auditbeat-custom-empty-index-1': {
      index: 'auditbeat-custom-empty-index-1',
      managed: false,
    },
    'auditbeat-custom-index-1': {
      index: 'auditbeat-custom-index-1',
      managed: false,
    },
  },
  ilmExplainPhaseCounts: {
    hot: 1,
    warm: 0,
    cold: 0,
    frozen: 0,
    unmanaged: 2,
  },
  indices: 3,
  pattern: 'auditbeat-*',
  results: undefined, // <-- no results
  sizeInBytes: 18820446,
  stats: {
    '.ds-auditbeat-8.6.1-2023.02.07-000001': {
      uuid: 'YpxavlUVTw2x_E_QtADrpg',
      health: 'yellow',
      primaries: {
        store: {
          size_in_bytes: 18791790,
          reserved_in_bytes: 0,
        },
      },
      status: 'open',
      total: {
        docs: {
          count: 19123,
          deleted: 0,
        },
      },
    },
    'auditbeat-custom-empty-index-1': {
      uuid: 'Iz5FJjsLQla34mD6kBAQBw',
      health: 'yellow',
      primaries: {
        store: {
          size_in_bytes: 247,
          reserved_in_bytes: 0,
        },
      },
      status: 'open',
      total: {
        docs: {
          count: 0,
          deleted: 0,
        },
      },
    },
    'auditbeat-custom-index-1': {
      uuid: 'xJvgb2QCQPSjlr7UnW8tFA',
      health: 'yellow',
      primaries: {
        store: {
          size_in_bytes: 28409,
          reserved_in_bytes: 0,
        },
      },
      status: 'open',
      total: {
        docs: {
          count: 4,
          deleted: 0,
        },
      },
    },
  },
};

/**
 * This `PatternRollup` containing the following indices:
 * ```
 * .ds-auditbeat-8.6.1-2023.02.07-000001
 * auditbeat-custom-empty-index-1
 * auditbeat-custom-index-1
 * ```
 * has `results`, for all three indexes, because all of them were checked.
 *
 * The `.ds-auditbeat-8.6.1-2023.02.07-000001` passed the check.
 * The `auditbeat-custom-empty-index-1` and `auditbeat-custom-index-1`
 * indices both failed their checks
 */
export const auditbeatWithAllResults: PatternRollup = {
  docsCount: 19127,
  error: null,
  ilmExplain: {
    '.ds-auditbeat-8.6.1-2023.02.07-000001': {
      index: '.ds-auditbeat-8.6.1-2023.02.07-000001',
      managed: true,
      policy: 'auditbeat',
      phase: 'hot',
    },
    'auditbeat-custom-empty-index-1': {
      index: 'auditbeat-custom-empty-index-1',
      managed: false,
    },
    'auditbeat-custom-index-1': {
      index: 'auditbeat-custom-index-1',
      managed: false,
    },
  },
  ilmExplainPhaseCounts: {
    hot: 1,
    warm: 0,
    cold: 0,
    frozen: 0,
    unmanaged: 2,
  },
  indices: 3,
  pattern: 'auditbeat-*',
  results: {
    '.ds-auditbeat-8.6.1-2023.02.07-000001': {
      docsCount: 19123,
      error: null,
      ilmPhase: 'hot',
      incompatible: 0,
      indexName: '.ds-auditbeat-8.6.1-2023.02.07-000001',
      markdownComments: ['foo', 'bar', 'baz'],
      pattern: 'auditbeat-*',
    },
    'auditbeat-custom-index-1': {
      docsCount: 4,
      error: null,
      ilmPhase: 'unmanaged',
      incompatible: 3,
      indexName: 'auditbeat-custom-index-1',
      markdownComments: ['foo', 'bar', 'baz'],
      pattern: 'auditbeat-*',
    },
    'auditbeat-custom-empty-index-1': {
      docsCount: 0,
      error: null,
      ilmPhase: 'unmanaged',
      incompatible: 1,
      indexName: 'auditbeat-custom-empty-index-1',
      markdownComments: ['foo', 'bar', 'baz'],
      pattern: 'auditbeat-*',
    },
  },
  sizeInBytes: 18820446,
  stats: {
    '.ds-auditbeat-8.6.1-2023.02.07-000001': {
      uuid: 'YpxavlUVTw2x_E_QtADrpg',
      health: 'yellow',
      primaries: {
        store: {
          size_in_bytes: 18791790,
          reserved_in_bytes: 0,
        },
      },
      status: 'open',
      total: {
        docs: {
          count: 19123,
          deleted: 0,
        },
      },
    },
    'auditbeat-custom-empty-index-1': {
      uuid: 'Iz5FJjsLQla34mD6kBAQBw',
      health: 'yellow',
      primaries: {
        store: {
          size_in_bytes: 247,
          reserved_in_bytes: 0,
        },
      },
      status: 'open',
      total: {
        docs: {
          count: 0,
          deleted: 0,
        },
      },
    },
    'auditbeat-custom-index-1': {
      uuid: 'xJvgb2QCQPSjlr7UnW8tFA',
      health: 'yellow',
      primaries: {
        store: {
          size_in_bytes: 28409,
          reserved_in_bytes: 0,
        },
      },
      status: 'open',
      total: {
        docs: {
          count: 4,
          deleted: 0,
        },
      },
    },
  },
};
