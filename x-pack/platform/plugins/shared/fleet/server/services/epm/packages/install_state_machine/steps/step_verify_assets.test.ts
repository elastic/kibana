/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { ElasticsearchAssetType } from '../../../../../types';
import { verifyEsAssetsExist } from '../../verify_es_assets';

import { stepVerifyAssets } from './step_verify_assets';

jest.mock('../../verify_es_assets');
jest.mock('../../utils', () => ({
  withPackageSpan: (_label: string, fn: () => unknown) => fn(),
}));

const mockVerifyEsAssetsExist = verifyEsAssetsExist as jest.MockedFunction<
  typeof verifyEsAssetsExist
>;

describe('stepVerifyAssets', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();

  const esReferences = [
    { type: ElasticsearchAssetType.ingestPipeline, id: 'my-pipeline' },
    { type: ElasticsearchAssetType.indexTemplate, id: 'my-template' },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('completes without throwing when all assets are present', async () => {
    mockVerifyEsAssetsExist.mockResolvedValue([]);

    await expect(
      stepVerifyAssets({ esClient, logger, esReferences } as any)
    ).resolves.not.toThrow();
  });

  it('does not throw and logs a warning when assets are missing', async () => {
    const missing = [{ type: ElasticsearchAssetType.ingestPipeline, id: 'my-pipeline' }];
    mockVerifyEsAssetsExist.mockResolvedValue(missing as any);

    await expect(
      stepVerifyAssets({ esClient, logger, esReferences } as any)
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      'stepVerifyAssets: 1 ES asset(s) missing after installation: ingest_pipeline/my-pipeline'
    );
  });

  it('lists every missing asset in the warning', async () => {
    const missing = [
      { type: ElasticsearchAssetType.ingestPipeline, id: 'my-pipeline' },
      { type: ElasticsearchAssetType.indexTemplate, id: 'my-template' },
    ];
    mockVerifyEsAssetsExist.mockResolvedValue(missing as any);

    await stepVerifyAssets({ esClient, logger, esReferences } as any);

    expect(logger.warn).toHaveBeenCalledWith(
      'stepVerifyAssets: 2 ES asset(s) missing after installation: ingest_pipeline/my-pipeline, index_template/my-template'
    );
  });

  it('does not fail on stale references to assets of several older package versions', async () => {
    const staleRefs = [
      { type: ElasticsearchAssetType.ingestPipeline, id: 'logs-endpoint.actions-9.3.1' },
      { type: ElasticsearchAssetType.ingestPipeline, id: 'logs-endpoint.events.file-9.3.1' },
      { type: ElasticsearchAssetType.ingestPipeline, id: 'logs-endpoint.actions-9.4.0' },
    ];
    const currentRefs = [
      { type: ElasticsearchAssetType.ingestPipeline, id: 'logs-endpoint.actions-9.6.1' },
    ];
    mockVerifyEsAssetsExist.mockResolvedValue(staleRefs as any);

    const result = await stepVerifyAssets({
      esClient,
      logger,
      esReferences: [...currentRefs, ...staleRefs],
    } as any);

    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('3 ES asset(s) missing after installation')
    );
  });

  it('does not modify installed_es references when assets are missing', async () => {
    mockVerifyEsAssetsExist.mockResolvedValue([
      { type: ElasticsearchAssetType.ingestPipeline, id: 'my-pipeline' },
    ] as any);
    const context = { esClient, logger, esReferences: [...esReferences] } as any;

    await stepVerifyAssets(context);

    expect(context.esReferences).toEqual(esReferences);
  });

  it('reads esReferences from context.installedPkg when context.esReferences is absent', async () => {
    mockVerifyEsAssetsExist.mockResolvedValue([]);

    const installedPkg = {
      attributes: { installed_es: esReferences },
    };

    await stepVerifyAssets({ esClient, logger, installedPkg } as any);

    expect(mockVerifyEsAssetsExist).toHaveBeenCalledWith(esClient, esReferences, logger);
  });

  it('skips verification and does not call verifyEsAssetsExist when there are no refs', async () => {
    await stepVerifyAssets({ esClient, logger, esReferences: [] } as any);

    expect(mockVerifyEsAssetsExist).not.toHaveBeenCalled();
  });
});
