/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { KiUsageServiceApi } from '../ki_usage/ki_usage_service';
import { getGetKiUsageStepDefinition, getRecordKiEnrichmentStepDefinition } from './ki_usage';
import { createMockStepContext } from './test_utils';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

const createUsageService = (): jest.Mocked<KiUsageServiceApi> => ({
  recordAccess: jest.fn(),
  getUsage: jest.fn().mockResolvedValue([]),
  recordEnrichment: jest.fn(),
});

const depsFor = (
  service: KiUsageServiceApi,
  { enabled = true, allowed = true }: { enabled?: boolean; allowed?: boolean } = {}
) => ({
  getKiUsageService: () => service,
  isContextEngineEnabled: async () => enabled,
  checkReadPrivilege: async () => allowed,
  checkWritePrivilege: async () => allowed,
});

describe('context-engine.getKiUsage', () => {
  it('returns the KIs read often enough since their last enrichment, most read first', async () => {
    const service = createUsageService();
    service.getUsage.mockResolvedValue([
      { ki_id: 'rare', access_count: 1, new_accesses: 1, last_accessed_at: daysAgo(1) },
      { ki_id: 'often', access_count: 9, new_accesses: 9, last_accessed_at: daysAgo(1) },
      {
        ki_id: 'just-enriched',
        access_count: 20,
        new_accesses: 5,
        last_accessed_at: daysAgo(0),
        last_enriched_at: daysAgo(2),
      },
      {
        ki_id: 'enriched-long-ago',
        access_count: 12,
        new_accesses: 4,
        last_accessed_at: daysAgo(0),
        last_enriched_at: daysAgo(30),
      },
    ]);
    const context = createMockStepContext({
      input: {
        ki_ids: ['rare', 'often', 'just-enriched', 'enriched-long-ago', 'never-read'],
        min_new_accesses: 3,
        min_days_since_enrichment: 7,
      },
      esClient: {},
      spaceId: 'space-1',
    });

    const result = await getGetKiUsageStepDefinition(depsFor(service)).handler(context);

    expect(service.getUsage).toHaveBeenCalledWith({
      spaceId: 'space-1',
      kiIds: ['rare', 'often', 'just-enriched', 'enriched-long-ago', 'never-read'],
    });
    expect(result).toEqual({
      output: {
        kis: [
          expect.objectContaining({ ki_id: 'often' }),
          expect.objectContaining({ ki_id: 'enriched-long-ago' }),
        ],
      },
    });
  });

  it('stops at limit', async () => {
    const service = createUsageService();
    service.getUsage.mockResolvedValue(
      ['a', 'b', 'c'].map((id) => ({
        ki_id: id,
        access_count: 5,
        new_accesses: 5,
        last_accessed_at: daysAgo(0),
      }))
    );
    const context = createMockStepContext({
      input: { ki_ids: ['a', 'b', 'c'], limit: 2 },
      esClient: {},
    });

    const result = await getGetKiUsageStepDefinition(depsFor(service)).handler(context);

    expect(result.output?.kis).toHaveLength(2);
  });

  it('needs the read privilege', async () => {
    const service = createUsageService();
    const context = createMockStepContext({ input: { ki_ids: ['a'] }, esClient: {} });

    const thrown = await getGetKiUsageStepDefinition(depsFor(service, { allowed: false }))
      .handler(context)
      .catch((error) => error);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('PermissionError');
    expect(service.getUsage).not.toHaveBeenCalled();
  });
});

describe('context-engine.recordKiEnrichment', () => {
  it('records each KI once in the workflow space', async () => {
    const service = createUsageService();
    const context = createMockStepContext({
      input: { ki_ids: ['a', 'b', 'a'] },
      esClient: {},
      spaceId: 'space-1',
    });

    const result = await getRecordKiEnrichmentStepDefinition(depsFor(service)).handler(context);

    expect(service.recordEnrichment).toHaveBeenCalledWith({
      spaceId: 'space-1',
      kiIds: ['a', 'b'],
    });
    expect(result).toEqual({ output: { recorded: 2 } });
  });

  it('refuses when Context Engine is disabled', async () => {
    const service = createUsageService();
    const context = createMockStepContext({ input: { ki_ids: ['a'] }, esClient: {} });

    const thrown = await getRecordKiEnrichmentStepDefinition(depsFor(service, { enabled: false }))
      .handler(context)
      .catch((error) => error);

    expect(thrown.type).toBe('FeatureDisabledError');
    expect(service.recordEnrichment).not.toHaveBeenCalled();
  });
});
