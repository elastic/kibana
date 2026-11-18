/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { resolveOntologyConfig } from '../../common/ontology';
import { callConnector, connectorFingerprintOf, type ConnectorSourceInfo } from './connector';
import { catalogConnectorSource, sampleConnectorSource } from './connector_catalog';
import { readOntologyKis } from './existing';
import { datasetKiId, sourceUri } from './ids';

jest.mock('./existing', () => ({
  ...jest.requireActual('./existing'),
  readOntologyKis: jest.fn(),
}));
jest.mock('./connector', () => ({
  ...jest.requireActual('./connector'),
  callConnector: jest.fn(),
}));

const NOW = new Date('2026-11-18T12:00:00.000Z');
const info: ConnectorSourceInfo = {
  id: 'drive-1',
  name: 'Team drive',
  type: '.google_drive',
  description: 'Google Drive files.',
  tools: [{ name: 'searchFiles', description: 'Search files', parameters: '{}' }],
  readActions: new Map(),
};

const catalog = (overrides: Partial<ConnectorSourceInfo> = {}, refresh?: string) =>
  catalogConnectorSource({
    esClient: {} as ElasticsearchClient,
    dest: { type: 'index', value: 'ai-index-idx-a' },
    spaceId: 'default',
    sourceId: 'src-drive',
    info: { ...info, ...overrides },
    config: resolveOntologyConfig({ enabled: true, refresh_interval: refresh }),
    now: NOW,
  });

describe('catalogConnectorSource', () => {
  beforeEach(() => {
    jest.mocked(readOntologyKis).mockResolvedValue([]);
  });

  it('describes a connector with no dataset KI yet, as connector:<id>', async () => {
    const output = await catalog();

    expect(output).toEqual(
      expect.objectContaining({
        describe: true,
        tools: info.tools,
        connector: expect.objectContaining({ id: 'drive-1', name: 'Team drive' }),
        source: { id: 'src-drive', type: 'connector', value: 'drive-1', datasets: 1 },
      })
    );
    expect(output.datasets).toEqual([
      expect.objectContaining({
        name: 'connector:drive-1',
        kind: 'connector',
        id: datasetKiId('connector:drive-1'),
        title: 'Team drive',
        reason: 'new',
      }),
    ]);
  });

  it('skips a connector described recently with the same read sub-actions', async () => {
    jest.mocked(readOntologyKis).mockResolvedValue([
      {
        id: datasetKiId('connector:drive-1'),
        type: 'ontology.dataset',
        title: 'Team drive',
        attributes: {
          'ontology.fingerprint': connectorFingerprintOf(info),
          'ontology.profiled_at': '2026-11-17T12:00:00.000Z',
        },
        references: [{ uri: sourceUri('src-drive'), relation: 'derived_from' }],
      },
    ]);

    await expect(catalog()).resolves.toEqual(
      expect.objectContaining({ describe: false, datasets: [], skipped: 'unchanged' })
    );
    await expect(catalog({}, '12h')).resolves.toEqual(expect.objectContaining({ describe: true }));
    await expect(
      catalog({
        tools: [...info.tools, { name: 'listFolders', description: '', parameters: '{}' }],
      })
    ).resolves.toEqual(
      expect.objectContaining({
        datasets: [expect.objectContaining({ reason: 'mapping_changed' })],
      })
    );
  });

  it('skips a connector with no read sub-actions agents may call', async () => {
    await expect(catalog({ tools: [] })).resolves.toEqual(
      expect.objectContaining({
        describe: false,
        skipped: 'The connector has no read sub-actions agents may call.',
      })
    );
  });
});

describe('sampleConnectorSource', () => {
  it('runs the planned calls, up to the cap, and catalogs the fields of the ones that worked', async () => {
    jest
      .mocked(callConnector)
      .mockResolvedValueOnce({ ok: true, data: { files: [{ id: 'f1' }] } })
      .mockResolvedValueOnce({ ok: false, error: 'invalid params' })
      .mockResolvedValue({ ok: true, data: {} });

    const output = await sampleConnectorSource({
      actionsClient: {} as never,
      info,
      sourceId: 'src-drive',
      calls: [
        { sub_action: 'searchFiles', params: '{"pageSize":5}' },
        { sub_action: 'searchFiles', params: { query: 'x' } },
        { sub_action: 'searchFiles', params: 'not json' },
        { params: '{}' },
        ...Array.from({ length: 4 }, () => ({ sub_action: 'searchFiles', params: '{}' })),
      ],
      valueSamples: true,
    });

    expect(output.samples).toHaveLength(5);
    expect(output.samples[0]).toEqual({
      sub_action: 'searchFiles',
      params: '{"pageSize":5}',
      ok: true,
      sample: '{"files":[{"id":"f1"}]}',
    });
    expect(output.samples[1]).toEqual(
      expect.objectContaining({ ok: false, error: 'invalid params' })
    );
    expect(output.rejected.map(({ reason }) => reason)).toEqual([
      'its params are not JSON, or are too long',
      'it names no sub_action',
      'over the cap of 5 calls',
    ]);
    expect(output.catalog).toEqual([
      {
        name: 'connector:drive-1',
        kind: 'connector',
        source_ids: ['src-drive'],
        fields: [
          {
            name: 'searchFiles.files.id',
            type: 'keyword',
            searchable: false,
            aggregatable: false,
            sample_values: ['f1'],
          },
        ],
      },
    ]);
  });
});
