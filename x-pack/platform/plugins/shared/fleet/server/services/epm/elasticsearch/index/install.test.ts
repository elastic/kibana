/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { ElasticsearchAssetType } from '../../../../types';
import { createArchiveIteratorFromMap } from '../../archive/archive_iterator';

import {
  getConcreteIndexNamesFromTemplates,
  installConcreteIndicesFromTemplates,
  isConcreteIndexPattern,
} from './install';

jest.mock('../../packages/es_assets_reference', () => ({
  updateEsAssetReferences: jest.fn(
    async (_so: unknown, _pkg: string, current: unknown[], opts: { assetsToAdd?: unknown[] }) => [
      ...(current as unknown[]),
      ...((opts.assetsToAdd as unknown[]) ?? []),
    ]
  ),
}));

const { updateEsAssetReferences } = jest.requireMock('../../packages/es_assets_reference');

describe('isConcreteIndexPattern', () => {
  it('accepts fixed index names', () => {
    expect(isConcreteIndexPattern('github-intel-teams')).toBe(true);
  });

  it('rejects wildcards', () => {
    expect(isConcreteIndexPattern('logs-*-default')).toBe(false);
    expect(isConcreteIndexPattern('metrics-system.?')).toBe(false);
  });
});

describe('installConcreteIndicesFromTemplates', () => {
  const logger = {
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  } as any;

  const createPackageInstallContext = (templates: Record<string, object>) => {
    const assetsMap = new Map<string, Buffer>();
    const paths: string[] = [];
    for (const [name, body] of Object.entries(templates)) {
      const path = `sdlc_intel-0.1.0/elasticsearch/index_template/${name}.json`;
      paths.push(path);
      assetsMap.set(path, Buffer.from(JSON.stringify(body)));
    }

    return {
      paths,
      packageInfo: { name: 'sdlc_intel' },
      archiveIterator: createArchiveIteratorFromMap(assetsMap),
    } as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('collects only concrete index patterns', async () => {
    const ctx = createPackageInstallContext({
      teams: { index_patterns: ['github-intel-teams'] },
      wildcard: { index_patterns: ['logs-*-default'] },
      people: { index_patterns: ['github-intel-people'] },
    });

    await expect(getConcreteIndexNamesFromTemplates(ctx)).resolves.toEqual([
      'github-intel-people',
      'github-intel-teams',
    ]);
  });

  it('creates missing indices and tracks EsAssetReference index refs', async () => {
    const esClient = {
      indices: {
        create: jest.fn().mockResolvedValue({ acknowledged: true }),
      },
    } as unknown as ElasticsearchClient;
    const savedObjectsClient = {} as SavedObjectsClientContract;
    const ctx = createPackageInstallContext({
      teams: { index_patterns: ['github-intel-teams'] },
    });

    const refs = await installConcreteIndicesFromTemplates(
      ctx,
      esClient,
      savedObjectsClient,
      logger,
      []
    );

    expect(esClient.indices.create).toHaveBeenCalledWith(
      { index: 'github-intel-teams' },
      { ignore: [400] }
    );
    expect(updateEsAssetReferences).toHaveBeenCalledWith(
      savedObjectsClient,
      'sdlc_intel',
      [],
      expect.objectContaining({
        assetsToAdd: [{ type: ElasticsearchAssetType.index, id: 'github-intel-teams' }],
      })
    );
    expect(refs).toEqual([{ type: ElasticsearchAssetType.index, id: 'github-intel-teams' }]);
  });

  it('does not fail install when create throws', async () => {
    const esClient = {
      indices: {
        create: jest.fn().mockRejectedValue(new Error('cluster_block_exception')),
      },
    } as unknown as ElasticsearchClient;
    const ctx = createPackageInstallContext({
      teams: { index_patterns: ['github-intel-teams'] },
    });

    const refs = await installConcreteIndicesFromTemplates(
      ctx,
      esClient,
      {} as SavedObjectsClientContract,
      logger,
      []
    );

    expect(refs).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
    expect(updateEsAssetReferences).not.toHaveBeenCalled();
  });
});
