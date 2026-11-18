/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { applyOntologyChanges } from '../ontology/apply';
import { catalogOntologySources } from '../ontology/catalog';
import { verifyOntologyJoins } from '../ontology/joins';
import { readOntologyQueryHistory } from '../ontology/query_history';
import { getApplyOntologyChangesStepDefinition } from './apply_ontology_changes';
import { getCatalogOntologySourcesStepDefinition } from './catalog_ontology_sources';
import { getReadOntologyQueryHistoryStepDefinition } from './read_ontology_query_history';
import { getVerifyOntologyJoinsStepDefinition } from './verify_ontology_joins';
import { createMockStepContext, mockKiStepTelemetry } from './test_utils';

jest.mock('../ontology/apply', () => ({ applyOntologyChanges: jest.fn() }));
jest.mock('../ontology/catalog', () => ({ catalogOntologySources: jest.fn() }));
jest.mock('../ontology/joins', () => ({ verifyOntologyJoins: jest.fn() }));
jest.mock('../ontology/query_history', () => ({ readOntologyQueryHistory: jest.fn() }));

const NOW = new Date('2026-11-18T12:00:00.000Z');
const trace = { type: 'elastic_agent', value: 'agent', query: 'FROM traces-*' };

const shop = (overrides: Record<string, unknown> = {}) => ({
  id: 'shop',
  dest: { type: 'index', value: 'ai-index-idx-shop' },
  managed: false,
  sources: [{ type: 'esql', value: 'FROM orders' }],
  traces: [trace],
  dreaming: { enabled: true, ontology: { enabled: true } },
  ...overrides,
});

const readDeps = ({
  get = jest.fn().mockResolvedValue(shop()),
  canRead = true,
  enabled = true,
}: { get?: jest.Mock; canRead?: boolean; enabled?: boolean } = {}) => ({
  getAiIndexService: () => ({ get } as unknown as AiIndexService),
  isContextEngineEnabled: async () => enabled,
  isMemoryEnabled: async () => true,
  checkReadPrivilege: async () => canRead,
});

const writeDeps = ({
  get = jest.fn().mockResolvedValue(shop()),
  canWrite = true,
}: { get?: jest.Mock; canWrite?: boolean } = {}) => ({
  getAiIndexService: () => ({ get } as unknown as AiIndexService),
  isContextEngineEnabled: async () => true,
  isDreamingAvailable: async () => true,
  checkWritePrivilege: async () => canWrite,
  ...mockKiStepTelemetry(),
});

const catalog = [{ name: 'orders', kind: 'index', source_ids: [], fields: [] }];

describe('ontology steps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('catalogOntologySources', () => {
    const run = (deps = readDeps(), input: Record<string, unknown> = {}) =>
      getCatalogOntologySourcesStepDefinition(deps, { getCurrentDate: () => NOW }).handler(
        createMockStepContext({ input: { ai_index_id: 'shop', ...input }, esClient: {} })
      );

    it('catalogs with the resolved config and the per-run cap', async () => {
      jest.mocked(catalogOntologySources).mockResolvedValue({
        datasets: [],
        catalog: [],
        skipped: [],
        stale: [],
        existing: [],
        sources: [],
      });

      await run(readDeps(), { max_datasets: 3 });

      expect(catalogOntologySources).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'default',
          maxDatasets: 3,
          now: NOW,
          config: {
            enabled: true,
            valueSamples: true,
            queryHistory: true,
            refreshInterval: '7d',
          },
        })
      );
    });

    it('fails without the read privilege, for a missing AI index, or with ontology off', async () => {
      await expect(run(readDeps({ canRead: false }))).rejects.toThrow(
        'Insufficient privileges to read AI indices'
      );
      await expect(
        run(readDeps({ get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('shop')) }))
      ).rejects.toThrow("AI index 'shop' not found");
      await expect(
        run(readDeps({ get: jest.fn().mockResolvedValue(shop({ dreaming: { enabled: true } })) }))
      ).rejects.toThrow("AI index 'shop' does not have ontology discovery turned on");
      expect(catalogOntologySources).not.toHaveBeenCalled();
    });

    it('reads nothing while Context Engine is off', async () => {
      await expect(run(readDeps({ enabled: false }))).resolves.toEqual({
        output: { datasets: [], catalog: [], skipped: [], stale: [], existing: [], sources: [] },
      });
    });
  });

  describe('readOntologyQueryHistory', () => {
    const input = { ai_index_id: 'shop', datasets: ['orders'], since: '2026-11-11T00:00:00.000Z' };
    const run = (deps = readDeps()) =>
      getReadOntologyQueryHistoryStepDefinition(deps, { getCurrentDate: () => NOW }).handler(
        createMockStepContext({ input, esClient: {} })
      );

    it('reads up to five minutes ago, leaving rounds that may still be exporting', async () => {
      jest
        .mocked(readOntologyQueryHistory)
        .mockResolvedValue({ queries: [], rounds: 0, sources: [] });

      await run();

      expect(readOntologyQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          traces: [trace],
          datasets: ['orders'],
          since: input.since,
          until: '2026-11-18T11:55:00.000Z',
          size: 200,
        })
      );
    });

    it('reads nothing without trace sources or with query history off', async () => {
      const empty = { output: { queries: [], rounds: 0, sources: [] } };
      await expect(
        run(readDeps({ get: jest.fn().mockResolvedValue(shop({ traces: [] })) }))
      ).resolves.toEqual(empty);
      await expect(
        run(
          readDeps({
            get: jest.fn().mockResolvedValue(
              shop({
                dreaming: { enabled: true, ontology: { enabled: true, query_history: false } },
              })
            ),
          })
        )
      ).resolves.toEqual(empty);
      expect(readOntologyQueryHistory).not.toHaveBeenCalled();
    });
  });

  describe('verifyOntologyJoins', () => {
    it('verifies the candidates against the catalog', async () => {
      jest.mocked(verifyOntologyJoins).mockResolvedValue({ verified: [], rejected: [] });
      const candidates = [{ from_dataset: 'orders' }];

      await getVerifyOntologyJoinsStepDefinition(readDeps()).handler(
        createMockStepContext({ input: { ai_index_id: 'shop', catalog, candidates }, esClient: {} })
      );

      expect(verifyOntologyJoins).toHaveBeenCalledWith(
        expect.objectContaining({ catalog, candidates })
      );
    });
  });

  describe('applyOntologyChanges', () => {
    const run = (deps = writeDeps(), input: Record<string, unknown> = {}) =>
      getApplyOntologyChangesStepDefinition(deps, { getCurrentDate: () => NOW }).handler(
        createMockStepContext({
          input: { ai_index_id: 'shop', catalog, changes: { terms: [] }, ...input },
          esClient: {},
        })
      );

    it('applies the parsed change set, treating missing lists as empty', async () => {
      jest.mocked(applyOntologyChanges).mockResolvedValue({
        created: 1,
        updated: 0,
        deleted: 0,
        rejected: [],
        dropped_access_patterns: 0,
      });

      await expect(run(writeDeps(), { joins: null, stale: null, changes: null })).resolves.toEqual({
        output: { created: 1, updated: 0, deleted: 0, rejected: [], dropped_access_patterns: 0 },
      });
      expect(applyOntologyChanges).toHaveBeenCalledWith(
        expect.objectContaining({
          aiIndexId: 'shop',
          spaceId: 'default',
          now: NOW,
          writer: expect.objectContaining({ uri: 'workflow://wf-1' }),
        }),
        { catalog, profiles: [], changes: { datasets: [], terms: [] }, joins: [], stale: [] }
      );
    });

    it('fails on an invalid change set, without the write privilege, or with ontology off', async () => {
      await expect(run(writeDeps(), { changes: { terms: [{ fields: [] }] } })).rejects.toThrow(
        'The ontology model returned an invalid change set'
      );
      await expect(run(writeDeps({ canWrite: false }))).rejects.toThrow('Insufficient privileges');
      await expect(
        run(writeDeps({ get: jest.fn().mockResolvedValue(shop({ dreaming: { enabled: true } })) }))
      ).rejects.toThrow("AI index 'shop' does not have ontology discovery turned on");
      expect(applyOntologyChanges).not.toHaveBeenCalled();
    });
  });
});
