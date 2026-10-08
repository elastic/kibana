/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { errors } from '@elastic/elasticsearch';

import { ElasticsearchAssetType } from '../../../../../common/types/models';
import type { EsAssetReference, PackageInstallContext } from '../../../../../common/types/models';
import { FleetError } from '../../../../errors';

import { createArchiveIteratorFromMap } from '../../archive/archive_iterator';
import { updateEsAssetReferences } from '../../packages/es_assets_reference';

import { installMlModel } from './install';

jest.mock('../../packages/es_assets_reference');

const MODEL_A_PATH = 'test_pkg-1.0.0/elasticsearch/ml_model/test_model_a.json';
const MODEL_B_PATH = 'test_pkg-1.0.0/elasticsearch/ml_model/test_model_b.json';
const MODEL_A_CONTENT = Buffer.from(JSON.stringify({ model_type: 'lang_ident_model_1' }));
const MODEL_B_CONTENT = Buffer.from(JSON.stringify({ model_type: 'ner_model_1' }));
const twoModelAssetsMap = new Map([
  [MODEL_A_PATH, MODEL_A_CONTENT],
  [MODEL_B_PATH, MODEL_B_CONTENT],
]);

function makeContext(paths: string[], assetsMap: Map<string, Buffer>): PackageInstallContext {
  return {
    packageInfo: { name: 'test_pkg', version: '1.0.0' } as PackageInstallContext['packageInfo'],
    paths,
    archiveIterator: createArchiveIteratorFromMap(assetsMap),
  } as unknown as PackageInstallContext;
}

describe('installMlModel', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createInternalClient>;
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  const existingRefs: EsAssetReference[] = [];

  beforeEach(() => {
    esClient = elasticsearchClientMock.createInternalClient();
    soClient = savedObjectsClientMock.create();
    logger = loggerMock.create();
    jest.mocked(updateEsAssetReferences).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call putTrainedModel for each model in the package', async () => {
    const ctx = makeContext([MODEL_A_PATH, MODEL_B_PATH], twoModelAssetsMap);

    await installMlModel(ctx, esClient, soClient, logger, existingRefs);

    expect(esClient.ml.putTrainedModel).toHaveBeenCalledTimes(2);
    expect(esClient.ml.putTrainedModel).toHaveBeenCalledWith(
      expect.objectContaining({ model_id: 'test_model_a' }),
      expect.anything()
    );
    expect(esClient.ml.putTrainedModel).toHaveBeenCalledWith(
      expect.objectContaining({ model_id: 'test_model_b' }),
      expect.anything()
    );
  });

  it('should traverse the archive exactly once for multiple models', async () => {
    const archiveIterator = createArchiveIteratorFromMap(twoModelAssetsMap);
    const traverseSpy = jest.spyOn(archiveIterator, 'traverseEntries');
    const ctx = {
      ...makeContext([MODEL_A_PATH, MODEL_B_PATH], twoModelAssetsMap),
      archiveIterator,
    };

    await installMlModel(
      ctx as unknown as PackageInstallContext,
      esClient,
      soClient,
      logger,
      existingRefs
    );

    expect(traverseSpy).toHaveBeenCalledTimes(1);
  });

  it('should not read non-ml_model paths from the archive', async () => {
    const ilmPath = 'test_pkg-1.0.0/elasticsearch/ilm_policy/logs.json';
    const assetsMap = new Map([...twoModelAssetsMap, [ilmPath, Buffer.from('{}')]]);
    const archiveIterator = createArchiveIteratorFromMap(assetsMap);
    const traverseSpy = jest.spyOn(archiveIterator, 'traverseEntries');
    const ctx = { ...makeContext([MODEL_A_PATH], assetsMap), archiveIterator };

    await installMlModel(
      ctx as unknown as PackageInstallContext,
      esClient,
      soClient,
      logger,
      existingRefs
    );

    const [, predicate] = traverseSpy.mock.calls[0];
    expect(predicate!(MODEL_A_PATH)).toBe(true);
    expect(predicate!(ilmPath)).toBe(false);
  });

  it('should call updateEsAssetReferences once with all model refs', async () => {
    const ctx = makeContext([MODEL_A_PATH, MODEL_B_PATH], twoModelAssetsMap);

    await installMlModel(ctx, esClient, soClient, logger, existingRefs);

    expect(updateEsAssetReferences).toHaveBeenCalledTimes(1);
    expect(updateEsAssetReferences).toHaveBeenCalledWith(soClient, 'test_pkg', existingRefs, {
      assetsToAdd: [
        { id: 'test_model_a', type: ElasticsearchAssetType.mlModel },
        { id: 'test_model_b', type: ElasticsearchAssetType.mlModel },
      ],
    });
  });

  it('should return original esReferences without traversal or ES calls when no ML models exist', async () => {
    const ilmPath = 'test_pkg-1.0.0/elasticsearch/ilm_policy/logs.json';
    const assetsMap = new Map([[ilmPath, Buffer.from('{}')]]);
    const archiveIterator = createArchiveIteratorFromMap(assetsMap);
    const traverseSpy = jest.spyOn(archiveIterator, 'traverseEntries');
    const ctx = { ...makeContext([ilmPath], assetsMap), archiveIterator };
    const refs: EsAssetReference[] = [{ id: 'existing', type: ElasticsearchAssetType.ilmPolicy }];

    const result = await installMlModel(
      ctx as unknown as PackageInstallContext,
      esClient,
      soClient,
      logger,
      refs
    );

    expect(result).toBe(refs);
    expect(traverseSpy).not.toHaveBeenCalled();
    expect(updateEsAssetReferences).not.toHaveBeenCalled();
    expect(esClient.ml.putTrainedModel).not.toHaveBeenCalled();
  });

  it('should swallow resource_already_exists_exception and continue installing remaining models', async () => {
    const ctx = makeContext([MODEL_A_PATH, MODEL_B_PATH], twoModelAssetsMap);

    esClient.ml.putTrainedModel.mockImplementationOnce(() => {
      throw new errors.ResponseError({
        statusCode: 400,
        body: { error: { type: 'resource_already_exists_exception' } },
      } as any);
    });

    await expect(
      installMlModel(ctx, esClient, soClient, logger, existingRefs)
    ).resolves.not.toThrow();
    expect(esClient.ml.putTrainedModel).toHaveBeenCalledTimes(2);
  });

  it('should propagate non-resource_already_exists errors as original error type, not PackageInvalidArchiveError', async () => {
    const ctx = makeContext([MODEL_A_PATH], new Map([[MODEL_A_PATH, MODEL_A_CONTENT]]));

    const originalError = new errors.ResponseError({
      statusCode: 500,
      body: { error: { type: 'internal_server_error' } },
    } as any);
    esClient.ml.putTrainedModel.mockImplementationOnce(() => {
      throw originalError;
    });

    await expect(installMlModel(ctx, esClient, soClient, logger, existingRefs)).rejects.toBe(
      originalError
    );
  });

  it('should throw when a selected ML model archive entry has no buffer', async () => {
    const sparseMap = new Map<string, Buffer | undefined>([[MODEL_A_PATH, undefined]]);
    const archiveIterator = createArchiveIteratorFromMap(sparseMap);
    const ctx = {
      ...makeContext([MODEL_A_PATH], twoModelAssetsMap),
      archiveIterator,
    };

    const err = await installMlModel(
      ctx as unknown as PackageInstallContext,
      esClient,
      soClient,
      logger,
      existingRefs
    ).catch((e) => e);
    expect(err).toBeInstanceOf(FleetError);
    expect(err.message).toContain(`No buffer for ML model archive entry at path: ${MODEL_A_PATH}`);

    expect(esClient.ml.putTrainedModel).not.toHaveBeenCalled();
  });
});
