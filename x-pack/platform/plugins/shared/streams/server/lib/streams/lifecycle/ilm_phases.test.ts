/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ilmPhases } from './ilm_phases';

describe('lifecycle helpers', () => {
  describe('ilmPhases', () => {
    it('aggregates size of each phase', () => {
      const stats = ilmPhases({
        policy: {
          phases: {
            hot: {},
            warm: { min_age: '2d' },
            cold: { min_age: '5d' },
            frozen: { min_age: '7d' },
            delete: { min_age: '10d' },
          },
        },
        indicesIlmDetails: {
          index_name_001: {
            index: 'index_name_001',
            managed: true,
            phase: 'frozen',
            policy: 'mypolicy',
          },
          index_name_002: {
            index: 'index_name_002',
            managed: true,
            phase: 'frozen',
            policy: 'mypolicy',
          },
          index_name_003: {
            index: 'index_name_003',
            managed: true,
            phase: 'cold',
            policy: 'mypolicy',
          },
          index_name_004: {
            index: 'index_name_004',
            managed: true,
            phase: 'warm',
            policy: 'mypolicy',
          },
          index_name_005: {
            index: 'index_name_005',
            managed: true,
            phase: 'hot',
            policy: 'mypolicy',
          },
          index_name_006: {
            index: 'index_name_006',
            managed: true,
            phase: 'hot',
            policy: 'mypolicy',
          },
        },
        indicesStats: {
          index_name_001: { total: { store: { size_in_bytes: 10, reserved_in_bytes: 0 } } },
          index_name_002: { total: { store: { size_in_bytes: 15, reserved_in_bytes: 0 } } },
          index_name_003: { total: { store: { size_in_bytes: 20, reserved_in_bytes: 0 } } },
          index_name_004: { total: { store: { size_in_bytes: 30, reserved_in_bytes: 0 } } },
          index_name_005: { total: { store: { size_in_bytes: 100, reserved_in_bytes: 0 } } },
          index_name_006: { total: { store: { size_in_bytes: 100, reserved_in_bytes: 0 } } },
        },
      });

      expect(stats).toEqual({
        hot: {
          name: 'hot',
          size_in_bytes: 200,
          min_age: undefined,
          rollover: {
            max_age: undefined,
            max_docs: undefined,
            max_primary_shard_docs: undefined,
            max_primary_shard_size: undefined,
            max_size: undefined,
          },
        },
        warm: { name: 'warm', size_in_bytes: 30, min_age: '2d' },
        cold: { name: 'cold', size_in_bytes: 20, min_age: '5d' },
        frozen: { name: 'frozen', size_in_bytes: 25, min_age: '7d' },
        delete: { name: 'delete', min_age: '10d' },
      });
    });

    it('only aggregates managed indices', () => {
      const stats = ilmPhases({
        policy: {
          phases: {
            hot: {},
            warm: { min_age: '2d' },
          },
        },
        indicesIlmDetails: {
          index_name_001: {
            index: 'index_name_001',
            managed: true,
            phase: 'hot',
            policy: 'mypolicy',
          },
          index_name_002: {
            index: 'index_name_002',
            managed: true,
            phase: 'hot',
            policy: 'mypolicy',
          },
          index_name_003: {
            index: 'index_name_003',
            managed: false,
          },
        },
        indicesStats: {
          index_name_001: { total: { store: { size_in_bytes: 10, reserved_in_bytes: 0 } } },
          index_name_002: { total: { store: { size_in_bytes: 10, reserved_in_bytes: 0 } } },
          index_name_003: { total: { store: { size_in_bytes: 20, reserved_in_bytes: 0 } } },
        },
      });

      expect(stats).toEqual({
        hot: {
          name: 'hot',
          size_in_bytes: 20,
          min_age: undefined,
          rollover: {
            max_age: undefined,
            max_docs: undefined,
            max_primary_shard_docs: undefined,
            max_primary_shard_size: undefined,
            max_size: undefined,
          },
        },
        warm: { name: 'warm', size_in_bytes: 0, min_age: '2d' },
      });
    });
  });
});
