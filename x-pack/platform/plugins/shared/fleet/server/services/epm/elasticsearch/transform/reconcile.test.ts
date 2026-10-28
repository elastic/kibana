/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { appContextService } from '../../../app_context';
import { createAppContextStartContractMock } from '../../../../mocks';

import { reconcileTransforms } from './reconcile';

describe('reconcileTransforms', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    esClient = elasticsearchClientMock.createClusterClient().asInternalUser;
    logger = loggerMock.create();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('deletes orphaned transforms that belong to the package but are not in keepIds', async () => {
    esClient.transform.getTransform.mockResponseOnce({
      count: 2,
      transforms: [
        // @ts-expect-error incomplete data
        {
          id: 'endpoint.metadata_current-default-0.15.0',
          _meta: { package: { name: 'endpoint' } },
        },
        // @ts-expect-error incomplete data
        {
          id: 'endpoint.metadata_current-default-0.16.0',
          _meta: { package: { name: 'endpoint' } },
        },
      ],
    });

    await reconcileTransforms(esClient, logger, 'endpoint', [
      'endpoint.metadata_current-default-0.16.0',
    ]);

    // 0.15.0 is orphaned — must be stopped and deleted without touching destination index
    expect(esClient.transform.stopTransform).toHaveBeenCalledWith(
      { transform_id: 'endpoint.metadata_current-default-0.15.0', force: true },
      { ignore: [404] }
    );
    expect(esClient.transform.deleteTransform).toHaveBeenCalledWith(
      {
        transform_id: 'endpoint.metadata_current-default-0.15.0',
        force: true,
        delete_dest_index: false,
      },
      { ignore: [404] }
    );
    // 0.16.0 is current — must NOT be deleted
    expect(esClient.transform.stopTransform).not.toHaveBeenCalledWith(
      expect.objectContaining({ transform_id: 'endpoint.metadata_current-default-0.16.0' }),
      expect.anything()
    );
    expect(esClient.transform.deleteTransform).not.toHaveBeenCalledWith(
      expect.objectContaining({ transform_id: 'endpoint.metadata_current-default-0.16.0' }),
      expect.anything()
    );
  });

  test('deletes multiple orphaned transforms in one pass', async () => {
    esClient.transform.getTransform.mockResponseOnce({
      count: 3,
      transforms: [
        // @ts-expect-error incomplete data
        { id: 'endpoint.metadata_current-default-0.1.0', _meta: { package: { name: 'endpoint' } } },
        // @ts-expect-error incomplete data
        {
          id: 'endpoint.metadata_current-default-0.15.0',
          _meta: { package: { name: 'endpoint' } },
        },
        // @ts-expect-error incomplete data
        {
          id: 'endpoint.metadata_current-default-0.16.0',
          _meta: { package: { name: 'endpoint' } },
        },
      ],
    });

    await reconcileTransforms(esClient, logger, 'endpoint', [
      'endpoint.metadata_current-default-0.16.0',
    ]);

    const stoppedIds = (esClient.transform.stopTransform.mock.calls as any[]).map(
      (c) => c[0].transform_id
    );
    expect(stoppedIds.sort()).toEqual([
      'endpoint.metadata_current-default-0.1.0',
      'endpoint.metadata_current-default-0.15.0',
    ]);
  });

  test('does not delete transforms from other packages', async () => {
    esClient.transform.getTransform.mockResponseOnce({
      count: 1,
      transforms: [
        // @ts-expect-error incomplete data
        { id: 'other.transform-default-0.1.0', _meta: { package: { name: 'other-pkg' } } },
      ],
    });

    await reconcileTransforms(esClient, logger, 'endpoint', []);

    expect(esClient.transform.stopTransform).not.toHaveBeenCalled();
    expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
  });

  test('does not delete transforms without _meta.package.name', async () => {
    esClient.transform.getTransform.mockResponseOnce({
      count: 1,
      transforms: [
        // @ts-expect-error incomplete data
        { id: 'endpoint.metadata_current-default-0.1.0', _meta: {} },
      ],
    });

    await reconcileTransforms(esClient, logger, 'endpoint', []);

    expect(esClient.transform.stopTransform).not.toHaveBeenCalled();
    expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
  });

  test('is a no-op when the package has no transforms in ES', async () => {
    esClient.transform.getTransform.mockResponseOnce({ count: 0, transforms: [] });

    await reconcileTransforms(esClient, logger, 'endpoint', []);

    expect(esClient.transform.stopTransform).not.toHaveBeenCalled();
    expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
  });

  test('swallows ES errors and logs a warning', async () => {
    esClient.transform.getTransform.mockImplementationOnce(() => {
      throw new Error('cluster unreachable');
    });

    await expect(reconcileTransforms(esClient, logger, 'endpoint', [])).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unreachable'));
  });

  test('swallows stopTransform errors and logs a warning', async () => {
    esClient.transform.getTransform.mockResponseOnce({
      count: 1,
      transforms: [
        // @ts-expect-error incomplete data
        { id: 'endpoint.metadata_current-default-0.1.0', _meta: { package: { name: 'endpoint' } } },
      ],
    });
    esClient.transform.stopTransform.mockImplementationOnce(() => {
      throw new Error('stop failed');
    });

    await expect(reconcileTransforms(esClient, logger, 'endpoint', [])).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('stop failed'));
  });

  test('continues deleting remaining orphans when one deletion fails mid-batch', async () => {
    // Regression guard: per-orphan error isolation — a failure on one orphan must not
    // prevent the others from being deleted. deleteTransforms is called once per orphan
    // so that a thrown error is caught individually.
    esClient.transform.getTransform.mockResponseOnce({
      count: 3,
      transforms: [
        // @ts-expect-error incomplete data
        { id: 'endpoint.metadata_current-default-0.1.0', _meta: { package: { name: 'endpoint' } } },
        // @ts-expect-error incomplete data
        {
          id: 'endpoint.metadata_current-default-0.14.0',
          _meta: { package: { name: 'endpoint' } },
        },
        // @ts-expect-error incomplete data
        {
          id: 'endpoint.metadata_current-default-0.15.0',
          _meta: { package: { name: 'endpoint' } },
        },
      ],
    });

    // First stopTransform call fails; the other two orphans should still be processed.
    esClient.transform.stopTransform.mockImplementationOnce(() => {
      throw new Error('stop failed for 0.1.0');
    });

    await expect(
      reconcileTransforms(esClient, logger, 'endpoint', [
        'endpoint.metadata_current-default-0.16.0',
      ])
    ).resolves.toBeUndefined();

    // First orphan's failure is logged as a warning, not thrown.
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('stop failed for 0.1.0'));

    // Remaining two orphans are still stopped and deleted despite the first failure.
    const stoppedIds = (esClient.transform.stopTransform.mock.calls as any[]).map(
      (c) => c[0].transform_id
    );
    expect(stoppedIds).toContain('endpoint.metadata_current-default-0.14.0');
    expect(stoppedIds).toContain('endpoint.metadata_current-default-0.15.0');
  });
});
