/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCompliancePack } from '../services/pack_deployment_service';

const createMockSoClient = () => ({
  find: jest.fn(),
});

const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('Pack Deployment Service', () => {
  let soClient: ReturnType<typeof createMockSoClient>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    soClient = createMockSoClient();
    logger = createMockLogger();
  });

  describe('buildCompliancePack', () => {
    it('builds a pack from enabled rules for a benchmark', async () => {
      soClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          {
            id: 'r1',
            attributes: {
              rule_id: 'cis-macos-1.1',
              query: 'SELECT 1',
              interval: 300,
              platform: 'darwin',
            },
          },
          {
            id: 'r2',
            attributes: {
              rule_id: 'cis-macos-1.2',
              query: 'SELECT 2',
              interval: 600,
              platform: 'darwin',
            },
          },
        ],
      });

      const pack = await buildCompliancePack(soClient as any, 'cis_macos', logger as any);
      expect(pack.name).toBe('compliance-cis_macos');
      expect(Object.keys(pack.queries)).toHaveLength(2);
      expect(pack.queries['compliance-cis-macos-1.1'].query).toBe('SELECT 1');
      expect(pack.queries['compliance-cis-macos-1.2'].interval).toBe(600);
    });

    it('returns empty queries when no enabled rules exist', async () => {
      soClient.find.mockResolvedValueOnce({ total: 0, saved_objects: [] });

      const pack = await buildCompliancePack(soClient as any, 'cis_windows', logger as any);
      expect(Object.keys(pack.queries)).toHaveLength(0);
    });
  });
});
