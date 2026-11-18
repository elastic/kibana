/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { applyOntologyChanges } from '../ontology/apply';
import { catalogOntologySources } from '../ontology/catalog';
import { resolveConnectorSource } from '../ontology/connector';
import { catalogConnectorSource, sampleConnectorSource } from '../ontology/connector_catalog';
import { ontologySourceId } from '../ontology/ids';
import { verifyOntologyJoins } from '../ontology/joins';
import { readOntologyQueryHistory } from '../ontology/query_history';
import { getApplyOntologyChangesStepDefinition } from './apply_ontology_changes';
import { getCatalogOntologySourcesStepDefinition } from './catalog_ontology_sources';
import {
  getCatalogConnectorSourceStepDefinition,
  getSampleConnectorSourceStepDefinition,
} from './connector_ontology';
import { getReadOntologyQueryHistoryStepDefinition } from './read_ontology_query_history';
import { getVerifyOntologyJoinsStepDefinition } from './verify_ontology_joins';
import { createMockStepContext, mockKiStepTelemetry } from './test_utils';

jest.mock('../ontology/apply', () => ({ applyOntologyChanges: jest.fn() }));
jest.mock('../ontology/catalog', () => ({ catalogOntologySources: jest.fn() }));
jest.mock('../ontology/connector_catalog', () => ({
  catalogConnectorSource: jest.fn(),
  sampleConnectorSource: jest.fn(),
}));
jest.mock('../ontology/connector', () => ({
  ...jest.requireActual('../ontology/connector'),
  resolveConnectorSource: jest.fn(),
}));
jest.mock('../ontology/joins', () => ({ verifyOntologyJoins: jest.fn() }));
jest.mock('../ontology/query_history', () => ({ readOntologyQueryHistory: jest.fn() }));

const NOW = new Date('2026-11-18T12:00:00.000Z');
const trace = { type: 'elastic_agent', value: 'agent', query: 'FROM traces-*' };
const esql = { type: 'esql' as const, value: 'FROM orders' };
const drive = { type: 'connector' as const, value: 'drive-1' };
const ESQL_ID = ontologySourceId(esql);
const DRIVE_ID = ontologySourceId(drive);

const shop = (overrides: Record<string, unknown> = {}) => ({
  id: 'shop',
  dest: { type: 'index', value: 'ai-index-idx-shop' },
  managed: false,
  sources: [esql, drive],
  traces: [trace],
  dreaming: {
    enabled: true,
    entities: { nodes: [{ type: 'customer' }] },
    ontology: { enabled: true },
  },
  ...overrides,
});

const actionsClient = { get: jest.fn(), execute: jest.fn() };
const extras = {
  getActions: async () =>
    ({
      getActionsClientWithRequest: async () => actionsClient,
    } as unknown as ActionsPluginStart),
};

const readDeps = ({
  get = jest.fn().mockResolvedValue(shop()),
  canRead = true,
  enabled = true,
}: { get?: jest.Mock; canRead?: boolean; enabled?: boolean } = {}) => ({
  getAiIndexService: () => ({ get } as unknown as AiIndexService),
  isContextEngineEnabled: async () => enabled,
  isMemoryEnabled: async () => true,
  checkReadPrivilege: async () => canRead,
  ...extras,
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
  ...extras,
});

const catalog = [{ name: 'orders', kind: 'index', source_ids: [], fields: [] }];
const driveInfo = {
  id: 'drive-1',
  name: 'Team drive',
  type: '.google_drive',
  description: 'Files.',
  tools: [],
  readActions: new Map(),
};

describe('ontology steps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(resolveConnectorSource).mockResolvedValue(driveInfo);
  });

  describe('catalogOntologySources', () => {
    const run = (deps = readDeps(), input: Record<string, unknown> = {}) =>
      getCatalogOntologySourcesStepDefinition(deps, { getCurrentDate: () => NOW }).handler(
        createMockStepContext({
          input: { ai_index_id: 'shop', source_id: ESQL_ID, ...input },
          esClient: {},
        })
      );

    it('catalogs its source with the resolved config and the per-run cap', async () => {
      jest.mocked(catalogOntologySources).mockResolvedValue({} as never);

      await run(readDeps(), { max_datasets: 3 });

      expect(catalogOntologySources).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: ESQL_ID,
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
      const { output } = await run(readDeps({ enabled: false }));

      expect(output).toEqual(
        expect.objectContaining({ datasets: [], catalog: [], others: [], stale: [] })
      );
    });
  });

  describe('readOntologyQueryHistory', () => {
    const run = (deps = readDeps(), sourceId = ESQL_ID) =>
      getReadOntologyQueryHistoryStepDefinition(deps, { getCurrentDate: () => NOW }).handler(
        createMockStepContext({
          input: {
            ai_index_id: 'shop',
            source_id: sourceId,
            datasets: ['orders'],
            since: '2026-11-11T00:00:00.000Z',
          },
          esClient: {},
        })
      );

    beforeEach(() => {
      jest
        .mocked(readOntologyQueryHistory)
        .mockResolvedValue({ queries: [], rounds: 0, sources: [] });
    });

    it('reads ES|QL queries on the datasets of an ES|QL source, up to five minutes ago', async () => {
      await run();

      expect(readOntologyQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          traces: [trace],
          target: { kind: 'esql', datasets: ['orders'] },
          until: '2026-11-18T11:55:00.000Z',
          size: 200,
        })
      );
    });

    it('reads the calls agents made on a connector source', async () => {
      await run(readDeps(), DRIVE_ID);

      expect(readOntologyQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { kind: 'connector', connectorId: 'drive-1', dataset: 'connector:drive-1' },
        })
      );
    });

    it('reads nothing without trace sources, with query history off, or for a gone source', async () => {
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
      await expect(run(readDeps(), 'gone')).resolves.toEqual(empty);
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

  describe('connector steps', () => {
    const input = { ai_index_id: 'shop', source_id: DRIVE_ID };

    it('catalogs a connector source through the actions client, as the workflow user', async () => {
      jest.mocked(catalogConnectorSource).mockResolvedValue({ describe: true } as never);

      await getCatalogConnectorSourceStepDefinition(readDeps(), {
        getCurrentDate: () => NOW,
      }).handler(createMockStepContext({ input, esClient: {} }));

      expect(resolveConnectorSource).toHaveBeenCalledWith(actionsClient, 'drive-1');
      expect(catalogConnectorSource).toHaveBeenCalledWith(
        expect.objectContaining({ sourceId: DRIVE_ID, info: driveInfo, now: NOW })
      );
    });

    it('skips a source that is not a connector source of the AI index', async () => {
      const { output } = await getCatalogConnectorSourceStepDefinition(readDeps()).handler(
        createMockStepContext({ input: { ...input, source_id: ESQL_ID }, esClient: {} })
      );

      expect(output).toEqual(
        expect.objectContaining({
          describe: false,
          skipped: 'The AI index has no such connector source any more.',
        })
      );
      expect(catalogConnectorSource).not.toHaveBeenCalled();
    });

    it('samples the planned calls with value samples as configured', async () => {
      jest
        .mocked(sampleConnectorSource)
        .mockResolvedValue({ samples: [], catalog: [], rejected: [] });
      const calls = [{ sub_action: 'searchFiles', params: '{}' }];

      await getSampleConnectorSourceStepDefinition(readDeps()).handler(
        createMockStepContext({ input: { ...input, calls }, esClient: {} })
      );

      expect(sampleConnectorSource).toHaveBeenCalledWith(
        expect.objectContaining({
          actionsClient,
          info: driveInfo,
          sourceId: DRIVE_ID,
          calls,
          valueSamples: true,
        })
      );
    });
  });

  describe('applyOntologyChanges', () => {
    const run = (deps = writeDeps(), input: Record<string, unknown> = {}) =>
      getApplyOntologyChangesStepDefinition(deps, { getCurrentDate: () => NOW }).handler(
        createMockStepContext({
          input: {
            ai_index_id: 'shop',
            source_id: ESQL_ID,
            catalog,
            changes: { terms: [] },
            ...input,
          },
          esClient: {},
        })
      );

    beforeEach(() => {
      jest.mocked(applyOntologyChanges).mockResolvedValue({
        created: 1,
        updated: 0,
        deleted: 0,
        rejected: [],
        dropped_access_patterns: 0,
      });
    });

    it('applies the parsed change set for its source with the configured entity types', async () => {
      await expect(run(writeDeps(), { joins: null, stale: null, changes: null })).resolves.toEqual({
        output: { created: 1, updated: 0, deleted: 0, rejected: [], dropped_access_patterns: 0 },
      });
      expect(applyOntologyChanges).toHaveBeenCalledWith(
        expect.objectContaining({
          aiIndexId: 'shop',
          spaceId: 'default',
          sourceId: ESQL_ID,
          entityTypes: [{ type: 'customer' }],
          now: NOW,
          writer: expect.objectContaining({ uri: 'workflow://wf-1' }),
        }),
        { catalog, profiles: [], changes: { datasets: [], terms: [] }, joins: [], stale: [] }
      );
      expect(
        jest.mocked(applyOntologyChanges).mock.calls[0][0].verifyConnectorCall
      ).toBeUndefined();
    });

    it('checks connector access patterns through the connector of a connector source', async () => {
      await run(writeDeps(), { source_id: DRIVE_ID });

      const [context] = jest.mocked(applyOntologyChanges).mock.calls[0];
      expect(context).toEqual(expect.objectContaining({ connectorId: 'drive-1' }));
      await expect(context.verifyConnectorCall?.('deleteFile', {})).resolves.toBe(false);
    });

    it('fails on an invalid change set, a gone source, without the privilege, or with ontology off', async () => {
      await expect(run(writeDeps(), { changes: { terms: [{ fields: [] }] } })).rejects.toThrow(
        'The ontology model returned an invalid change set'
      );
      await expect(run(writeDeps(), { source_id: 'gone' })).rejects.toThrow(
        "AI index 'shop' has no source 'gone' any more"
      );
      await expect(run(writeDeps({ canWrite: false }))).rejects.toThrow('Insufficient privileges');
      await expect(
        run(writeDeps({ get: jest.fn().mockResolvedValue(shop({ dreaming: { enabled: true } })) }))
      ).rejects.toThrow("AI index 'shop' does not have ontology discovery turned on");
      expect(applyOntologyChanges).not.toHaveBeenCalled();
    });
  });
});
