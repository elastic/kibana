/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPolicyUsage, normalizeIlmPhases } from './ilm_policies';

describe('lifecycle helpers', () => {
  describe('buildPolicyUsage', () => {
    it('derives data streams from backing indices', () => {
      const dataStreamByBackingIndices: Record<string, string> = {
        '.ds-logs-nginx.access-2024.01.01-000001': 'logs-nginx.access',
        '.ds-logs-nginx.access-2024.01.02-000002': 'logs-nginx.access',
        '.ds-logs-system.auth-2024.01.02-000001': 'logs-system.auth',
      };

      const usage = buildPolicyUsage(
        {
          in_use_by: {
            indices: [
              '.ds-logs-nginx.access-2024.01.01-000001',
              '.ds-logs-nginx.access-2024.01.02-000002',
              '.ds-logs-system.auth-2024.01.02-000001',
              'regular-index-000001',
            ],
          },
        },
        dataStreamByBackingIndices
      );

      expect(usage).toEqual({
        in_use_by: {
          data_streams: ['logs-nginx.access', 'logs-system.auth'],
          indices: ['regular-index-000001'],
        },
      });
    });

    it('merges explicit and derived data streams without duplicates', () => {
      const dataStreamByBackingIndices: Record<string, string> = {
        '.ds-logs-nginx.access-2024.01.01-000001': 'logs-nginx.access',
      };

      const usage = buildPolicyUsage(
        {
          in_use_by: {
            indices: ['.ds-logs-nginx.access-2024.01.01-000001', 'regular-index-000001'],
            data_streams: ['logs-explicit', 'logs-nginx.access'],
          },
        },
        dataStreamByBackingIndices
      );

      expect(usage).toEqual({
        in_use_by: {
          data_streams: ['logs-explicit', 'logs-nginx.access'],
          indices: ['regular-index-000001'],
        },
      });
    });
  });

  describe('normalizeIlmPhases', () => {
    it('returns an empty object when phases are missing', () => {
      expect(normalizeIlmPhases(undefined)).toEqual({});
    });

    it('drops undefined phases', () => {
      const normalized = normalizeIlmPhases({
        hot: { actions: { rollover: { max_age: '1d' } } },
        warm: { min_age: '2d' },
        frozen: undefined,
      } as unknown as Parameters<typeof normalizeIlmPhases>[0]);

      expect(normalized).toEqual({
        hot: { actions: { rollover: { max_age: '1d' } } },
        warm: { min_age: '2d' },
      });
    });
  });
});
