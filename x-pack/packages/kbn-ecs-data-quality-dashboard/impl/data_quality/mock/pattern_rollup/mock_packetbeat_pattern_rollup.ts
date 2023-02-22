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
 * .ds-packetbeat-8.5.3-2023.02.04-000001
 * .ds-packetbeat-8.6.1-2023.02.04-000001
 *
 * ```
 * has no `results`, because the indices were NOT checked
 */
export const packetbeatNoResults: PatternRollup = {
  docsCount: 3258632,
  error: null,
  ilmExplain: {
    '.ds-packetbeat-8.6.1-2023.02.04-000001': {
      index: '.ds-packetbeat-8.6.1-2023.02.04-000001',
      managed: true,
      policy: 'packetbeat',
      phase: 'hot',
    },
    '.ds-packetbeat-8.5.3-2023.02.04-000001': {
      index: '.ds-packetbeat-8.5.3-2023.02.04-000001',
      managed: true,
      policy: 'packetbeat',
      phase: 'hot',
    },
  },
  ilmExplainPhaseCounts: {
    hot: 2,
    warm: 0,
    cold: 0,
    frozen: 0,
    unmanaged: 0,
  },
  indices: 2,
  pattern: 'packetbeat-*',
  results: undefined,
  stats: {
    '.ds-packetbeat-8.6.1-2023.02.04-000001': {
      uuid: 'x5Uuw4j4QM2YidHLNixCwg',
      health: 'yellow',
      status: 'open',
      total: {
        docs: {
          count: 1628343,
          deleted: 0,
        },
      },
    },
    '.ds-packetbeat-8.5.3-2023.02.04-000001': {
      uuid: 'we0vNWm2Q6iz6uHubyHS6Q',
      health: 'yellow',
      status: 'open',
      total: {
        docs: {
          count: 1630289,
          deleted: 0,
        },
      },
    },
  },
};

/**
 * This `PatternRollup` containing the following indices:
 * ```
 * .ds-packetbeat-8.5.3-2023.02.04-000001
 * .ds-packetbeat-8.6.1-2023.02.04-000001
 *
 * ```
 * has partial `results`, because:
 * 1) Errors occurred while checking the `.ds-packetbeat-8.5.3-2023.02.04-000001` index
 * 2) The `.ds-packetbeat-8.6.1-2023.02.04-000001` passed the check
 */
export const packetbeatWithSomeErrors: PatternRollup = {
  docsCount: 3258632,
  error: null,
  ilmExplain: {
    '.ds-packetbeat-8.6.1-2023.02.04-000001': {
      index: '.ds-packetbeat-8.6.1-2023.02.04-000001',
      managed: true,
      policy: 'packetbeat',
      phase: 'hot',
    },
    '.ds-packetbeat-8.5.3-2023.02.04-000001': {
      index: '.ds-packetbeat-8.5.3-2023.02.04-000001',
      managed: true,
      policy: 'packetbeat',
      phase: 'hot',
    },
  },
  ilmExplainPhaseCounts: {
    hot: 2,
    warm: 0,
    cold: 0,
    frozen: 0,
    unmanaged: 0,
  },
  indices: 2,
  pattern: 'packetbeat-*',
  results: {
    '.ds-packetbeat-8.5.3-2023.02.04-000001': {
      docsCount: 1630289,
      error:
        'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
      ilmPhase: 'hot',
      incompatible: undefined,
      indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
      markdownComments: ['foo', 'bar', 'baz'],
      pattern: 'packetbeat-*',
    },
    '.ds-packetbeat-8.6.1-2023.02.04-000001': {
      docsCount: 1628343,
      error: null,
      ilmPhase: 'hot',
      incompatible: 0,
      indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
      markdownComments: ['foo', 'bar', 'baz'],
      pattern: 'packetbeat-*',
    },
  },
  stats: {
    '.ds-packetbeat-8.6.1-2023.02.04-000001': {
      uuid: 'x5Uuw4j4QM2YidHLNixCwg',
      health: 'yellow',
      status: 'open',
      total: {
        docs: {
          count: 1628343,
          deleted: 0,
        },
      },
    },
    '.ds-packetbeat-8.5.3-2023.02.04-000001': {
      uuid: 'we0vNWm2Q6iz6uHubyHS6Q',
      health: 'yellow',
      status: 'open',
      total: {
        docs: {
          count: 1630289,
          deleted: 0,
        },
      },
    },
  },
};
