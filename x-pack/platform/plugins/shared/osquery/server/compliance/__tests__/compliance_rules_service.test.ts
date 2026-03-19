/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  findComplianceRules,
  getComplianceRule,
  createComplianceRule,
  updateComplianceRule,
  deleteComplianceRule,
  bulkActionComplianceRules,
  getMutedRulesState,
  listBenchmarks,
} from '../services/compliance_rules_service';
import { COMPLIANCE_RULE_SO_TYPE } from '../../../common/compliance';

const createMockSoClient = () => ({
  find: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  bulkUpdate: jest.fn(),
});

const makeRuleSo = (overrides: Record<string, unknown> = {}) => ({
  id: 'test-id',
  attributes: {
    rule_id: 'cis-macos-1.1',
    name: 'Test Rule',
    description: 'A test rule',
    query: 'SELECT 1',
    remediation: 'Fix it',
    benchmark: { id: 'cis_macos', name: 'CIS macOS', version: 'v1.0.0', posture_type: 'endpoint' },
    rule_number: '1.1',
    section: 'System Preferences',
    level: 1,
    platform: 'darwin',
    frameworks: [{ id: 'NIST-800-53', version: 'Rev.5', control: 'CM-6' }],
    tags: ['cis'],
    enabled: true,
    interval: 300,
    prebuilt: true,
    resource_type: 'system',
    ...overrides,
  },
});

describe('ComplianceRulesService', () => {
  let soClient: ReturnType<typeof createMockSoClient>;

  beforeEach(() => {
    soClient = createMockSoClient();
  });

  describe('findComplianceRules', () => {
    it('returns paginated rules', async () => {
      soClient.find.mockResolvedValueOnce({
        total: 1,
        page: 1,
        per_page: 20,
        saved_objects: [makeRuleSo()],
      });

      const result = await findComplianceRules(soClient as any);
      expect(result.total).toBe(1);
      expect(result.rules[0].rule_id).toBe('cis-macos-1.1');
    });

    it('applies benchmark filter with correct path', async () => {
      soClient.find.mockResolvedValueOnce({ total: 0, page: 1, per_page: 20, saved_objects: [] });

      await findComplianceRules(soClient as any, { benchmarkId: 'cis_macos' });
      const call = soClient.find.mock.calls[0][0];
      expect(call.filter).toContain('benchmark.id');
      expect(call.filter).not.toContain('benchmark_id:');
    });

    it('applies multiple filters combined with AND', async () => {
      soClient.find.mockResolvedValueOnce({ total: 0, page: 1, per_page: 20, saved_objects: [] });

      await findComplianceRules(soClient as any, { platform: 'darwin', enabled: true });
      const call = soClient.find.mock.calls[0][0];
      expect(call.filter).toContain('platform: "darwin"');
      expect(call.filter).toContain('enabled: true');
      expect(call.filter).toContain(' AND ');
    });
  });

  describe('getComplianceRule', () => {
    it('returns a rule by ID', async () => {
      soClient.get.mockResolvedValueOnce(makeRuleSo());
      const rule = await getComplianceRule(soClient as any, 'test-id');
      expect(rule.id).toBe('test-id');
      expect(rule.name).toBe('Test Rule');
    });
  });

  describe('createComplianceRule', () => {
    it('creates a rule with prebuilt=false', async () => {
      soClient.create.mockResolvedValueOnce(makeRuleSo({ prebuilt: false }));
      const rule = await createComplianceRule(soClient as any, makeRuleSo().attributes);
      const createCall = soClient.create.mock.calls[0][1];
      expect(createCall.prebuilt).toBe(false);
    });
  });

  describe('updateComplianceRule', () => {
    it('updates and returns the rule', async () => {
      soClient.update.mockResolvedValueOnce({});
      soClient.get.mockResolvedValueOnce(makeRuleSo({ name: 'Updated' }));
      const rule = await updateComplianceRule(soClient as any, 'test-id', { name: 'Updated' });
      expect(rule.name).toBe('Updated');
    });
  });

  describe('deleteComplianceRule', () => {
    it('deletes non-prebuilt rules', async () => {
      soClient.get.mockResolvedValueOnce(makeRuleSo({ prebuilt: false }));
      soClient.delete.mockResolvedValueOnce({});
      await deleteComplianceRule(soClient as any, 'test-id');
      expect(soClient.delete).toHaveBeenCalledWith(COMPLIANCE_RULE_SO_TYPE, 'test-id');
    });

    it('rejects deleting prebuilt rules', async () => {
      soClient.get.mockResolvedValueOnce(makeRuleSo({ prebuilt: true }));
      await expect(deleteComplianceRule(soClient as any, 'test-id')).rejects.toThrow(
        'Cannot delete prebuilt'
      );
    });
  });

  describe('bulkActionComplianceRules', () => {
    it('enables rules via bulkUpdate', async () => {
      soClient.bulkUpdate.mockResolvedValueOnce({});
      const result = await bulkActionComplianceRules(soClient as any, 'enable', ['r1', 'r2']);
      expect(result.updated).toBe(2);
      expect(soClient.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'r1', attributes: { enabled: true } }),
        ])
      );
    });

    it('mutes rules by updating benchmark state', async () => {
      soClient.get
        .mockRejectedValueOnce(new Error('not found'))
        .mockResolvedValueOnce(makeRuleSo());
      soClient.update.mockResolvedValueOnce({});
      const result = await bulkActionComplianceRules(soClient as any, 'mute', ['test-id']);
      expect(result.updated).toBe(1);
    });
  });

  describe('getMutedRulesState', () => {
    it('returns empty object when no state exists', async () => {
      soClient.get.mockRejectedValueOnce(new Error('not found'));
      const state = await getMutedRulesState(soClient as any);
      expect(state).toEqual({});
    });

    it('returns muted rules from SO', async () => {
      soClient.get.mockResolvedValueOnce({
        attributes: { muted_rules: { 'cis_macos:v1.0.0:1.1': { muted: true } } },
      });
      const state = await getMutedRulesState(soClient as any);
      expect(state['cis_macos:v1.0.0:1.1']).toBeDefined();
    });
  });

  describe('listBenchmarks', () => {
    it('returns benchmarks from aggregation', async () => {
      soClient.find.mockResolvedValueOnce({
        total: 30,
        page: 1,
        per_page: 0,
        saved_objects: [],
        aggregations: {
          benchmarks: {
            buckets: [
              {
                key: 'cis_macos',
                doc_count: 10,
                benchmark_name: { buckets: [{ key: 'CIS macOS' }] },
                benchmark_version: { buckets: [{ key: 'v1.0.0' }] },
                platforms: { buckets: [{ key: 'darwin' }] },
                levels: { buckets: [{ key: 1 }, { key: 2 }] },
                enabled_count: { doc_count: 8 },
              },
            ],
          },
        },
      });

      const benchmarks = await listBenchmarks(soClient as any);
      expect(benchmarks).toHaveLength(1);
      expect(benchmarks[0].id).toBe('cis_macos');
      expect(benchmarks[0].name).toBe('CIS macOS');
      expect(benchmarks[0].total_rules).toBe(10);
      expect(benchmarks[0].enabled_rules).toBe(8);
      expect(benchmarks[0].platforms).toEqual(['darwin']);
    });
  });
});
