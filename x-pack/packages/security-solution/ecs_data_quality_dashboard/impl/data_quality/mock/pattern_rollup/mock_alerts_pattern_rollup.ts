/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PatternRollup } from '../../types';

/**
 * This `PatternRollup` containing (just) the
 * `.internal.alerts-security.alerts-default-000001`
 * index has NO `results`, because the index was not checked
 */
export const alertIndexNoResults: PatternRollup = {
  docsCount: 25914,
  error: null,
  ilmExplain: {
    '.internal.alerts-security.alerts-default-000001': {
      index: '.internal.alerts-security.alerts-default-000001',
      managed: true,
      policy: '.alerts-ilm-policy',
      phase: 'hot',
    },
  },
  ilmExplainPhaseCounts: {
    hot: 1,
    warm: 0,
    cold: 0,
    frozen: 0,
    unmanaged: 0,
  },
  indices: 1,
  pattern: '.alerts-security.alerts-default',
  results: undefined, // <-- no results
  sizeInBytes: 6423408623,
  stats: {
    '.internal.alerts-security.alerts-default-000001': {
      health: 'green',
      status: 'open',
      total: {
        docs: {
          count: 25914,
          deleted: 0,
        },
      },
    },
  },
};

/**
 * This `PatternRollup` containing (just) the
 * `.internal.alerts-security.alerts-default-000001`
 * index has `results`, where the index passed the check
 */
export const alertIndexWithAllResults: PatternRollup = {
  docsCount: 26093,
  error: null,
  ilmExplain: {
    '.internal.alerts-security.alerts-default-000001': {
      index: '.internal.alerts-security.alerts-default-000001',
      managed: true,
      policy: '.alerts-ilm-policy',
      phase: 'hot',
    },
  },
  ilmExplainPhaseCounts: {
    hot: 1,
    warm: 0,
    cold: 0,
    frozen: 0,
    unmanaged: 0,
  },
  indices: 1,
  pattern: '.alerts-security.alerts-default',
  results: {
    '.internal.alerts-security.alerts-default-000001': {
      docsCount: 26093,
      error: null,
      ilmPhase: 'hot',
      incompatible: 0,
      indexName: '.internal.alerts-security.alerts-default-000001',
      markdownComments: ['foo', 'bar', 'baz'],
      pattern: '.alerts-security.alerts-default',
    },
  },
  sizeInBytes: 29717961631,
  stats: {
    '.internal.alerts-security.alerts-default-000001': {
      health: 'green',
      status: 'open',
      total: {
        docs: {
          count: 26093,
          deleted: 0,
        },
      },
    },
  },
};
