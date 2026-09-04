/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/order
import { createAppContextStartContractMock } from '../../../../mocks';

jest.mock('../../packages/get', () => {
  return { getInstallation: jest.fn(), getInstallationObject: jest.fn() };
});

import { errors } from '@elastic/elasticsearch';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { getInstallation, getInstallationObject } from '../../packages';
import type { Installation } from '../../../../types';
import { ElasticsearchAssetType } from '../../../../types';
import { appContextService } from '../../../app_context';

import { getESAssetMetadata } from '../meta';

import type { PackageInstallContext } from '../../../../../common/types';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../constants';

import { installTransforms } from './install';

describe('test transform install with legacy schema', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    esClient = elasticsearchClientMock.createClusterClient().asInternalUser;
    (getInstallation as jest.MockedFunction<typeof getInstallation>).mockReset();
    (getInstallationObject as jest.MockedFunction<typeof getInstallationObject>).mockReset();
    savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.update.mockImplementation(async (type, id, attributes) => ({
      type: PACKAGES_SAVED_OBJECT_TYPE,
      id: 'endpoint',
      attributes,
      references: [],
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('can install new versions and removes older version', async () => {
    const previousInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.policy-0.16.0-dev.0',
          type: ElasticsearchAssetType.ingestPipeline,
        },
        {
          id: 'endpoint.metadata_current-default-0.15.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown as Installation;

    const currentInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.policy-0.16.0-dev.0',
          type: ElasticsearchAssetType.ingestPipeline,
        },
        {
          id: 'endpoint.metadata_current-default-0.15.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
        {
          id: 'endpoint.metadata_current-default-0.16.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
        {
          id: 'endpoint.metadata-default-0.16.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown as Installation;
    (getInstallation as jest.MockedFunction<typeof getInstallation>)
      .mockReturnValueOnce(Promise.resolve(previousInstallation))
      .mockReturnValueOnce(Promise.resolve(currentInstallation));

    (
      getInstallationObject as jest.MockedFunction<typeof getInstallationObject>
    ).mockReturnValueOnce(
      Promise.resolve({
        attributes: {
          installed_es: previousInstallation.installed_es,
        },
      } as unknown as SavedObject<Installation>)
    );

    esClient.transform.getTransform.mockResponseOnce({
      count: 1,
      transforms: [
        // @ts-expect-error incomplete data
        {
          dest: {
            index: 'index',
          },
        },
      ],
    });

    await installTransforms({
      packageInstallContext: {
        packageInfo: {
          name: 'endpoint',
          version: '0.16.0-dev.0',
          data_streams: [
            {
              type: 'metrics',
              dataset: 'endpoint.metadata',
              title: 'Endpoint Metadata',
              release: 'experimental',
              package: 'endpoint',
              ingest_pipeline: 'default',
              elasticsearch: {
                'index_template.mappings': {
                  dynamic: false,
                },
              },
              path: 'metadata',
            },
            {
              type: 'metrics',
              dataset: 'endpoint.metadata_current',
              title: 'Endpoint Metadata Current',
              release: 'experimental',
              package: 'endpoint',
              ingest_pipeline: 'default',
              elasticsearch: {
                'index_template.mappings': {
                  dynamic: false,
                },
              },
              path: 'metadata_current',
            },
          ],
        },
        paths: [
          'endpoint-0.16.0-dev.0/data_stream/policy/elasticsearch/ingest_pipeline/default.json',
          'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata/default.json',
          'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/default.json',
        ],
        assetsMap: new Map([
          [
            'endpoint-0.16.0-dev.0/data_stream/policy/elasticsearch/ingest_pipeline/default.json',
            Buffer.from('{"content": "data"}'),
          ],
          [
            'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata/default.json',
            Buffer.from('{"content": "data"}'),
          ],
          [
            'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/default.json',
            Buffer.from('{"content": "data"}'),
          ],
        ]),
      } as unknown as PackageInstallContext,
      esClient,
      savedObjectsClient,
      logger: loggerMock.create(),
      esReferences: previousInstallation.installed_es,
    });

    expect(esClient.transform.stopTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.15.0-dev.0',
          force: true,
        },
        { ignore: [404] },
      ],
    ]);
    expect(esClient.transform.deleteTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.15.0-dev.0',
          force: true,
          delete_dest_index: true,
        },
        { ignore: [404] },
      ],
    ]);

    const meta = getESAssetMetadata({ packageName: 'endpoint' });

    expect(esClient.transform.putTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata-default-0.16.0-dev.0',
          defer_validation: true,
          body: { content: 'data', _meta: meta },
        },
        { ignore: [409] },
      ],
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.16.0-dev.0',
          defer_validation: true,
          body: { content: 'data', _meta: meta },
        },
        { ignore: [409] },
      ],
    ]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata-default-0.16.0-dev.0',
        },
        { ignore: [409] },
      ],
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.16.0-dev.0',
        },
        { ignore: [409] },
      ],
    ]);

    // Single SO update: assetsToAdd and assetsToRemove are applied in one call so the old
    // ref is removed and the new refs are added atomically. The previous code used two
    // separate calls which wiped the new refs on same-version reinstalls (elastic/kibana#217503).
    expect(savedObjectsClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [
            {
              id: 'metrics-endpoint.policy-0.16.0-dev.0',
              type: 'ingest_pipeline',
            },
            {
              id: 'endpoint.metadata-default-0.16.0-dev.0',
              type: 'transform',
            },
            {
              id: 'endpoint.metadata_current-default-0.16.0-dev.0',
              type: 'transform',
            },
          ],
        },
        {
          refresh: false,
        },
      ],
    ]);
  });

  test('same-version reinstall keeps transform refs in installed_es', async () => {
    // Regression test for elastic/kibana#217503: force-reinstalling the same package version
    // produced legacy transform ids byte-identical to the previous refs. The old two-call SO
    // update pattern added the refs first, then removed the "previous" refs — wiping the freshly
    // added ones and leaving installed_es with zero transform entries while ES still had the
    // live transforms. On the next upgrade nothing was deleted and duplicates accumulated.
    const version = '0.16.0-dev.0';
    const transformId = `endpoint.metadata_current-default-${version}`;

    const installation: Installation = {
      installed_es: [
        {
          id: transformId,
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown as Installation;

    (getInstallation as jest.MockedFunction<typeof getInstallation>).mockReturnValueOnce(
      Promise.resolve(installation)
    );

    await installTransforms({
      packageInstallContext: {
        packageInfo: {
          name: 'endpoint',
          version,
          data_streams: [
            {
              type: 'metrics',
              dataset: 'endpoint.metadata_current',
              title: 'Endpoint Metadata Current',
              release: 'experimental',
              package: 'endpoint',
              ingest_pipeline: 'default',
              elasticsearch: { 'index_template.mappings': { dynamic: false } },
              path: 'metadata_current',
            },
          ],
        },
        paths: [`endpoint-${version}/elasticsearch/transform/metadata_current/default.json`],
        assetsMap: new Map([
          [
            `endpoint-${version}/elasticsearch/transform/metadata_current/default.json`,
            Buffer.from('{"content": "data"}'),
          ],
        ]),
      } as unknown as PackageInstallContext,
      esClient,
      savedObjectsClient,
      logger: loggerMock.create(),
      esReferences: installation.installed_es,
    });

    // The transform ref must still be present — not wiped by the reinstall.
    const lastUpdateCall =
      savedObjectsClient.update.mock.calls[savedObjectsClient.update.mock.calls.length - 1];
    const finalInstalledEs = (
      lastUpdateCall[2] as { installed_es: Array<{ id: string; type: string }> }
    ).installed_es;
    expect(finalInstalledEs).toEqual([{ id: transformId, type: ElasticsearchAssetType.transform }]);
  });

  test('can install new version and when no older version', async () => {
    const previousInstallation: Installation = {
      installed_es: [],
    } as unknown as Installation;

    const currentInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.metadata-current-default-0.16.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown as Installation;
    (getInstallation as jest.MockedFunction<typeof getInstallation>)
      .mockReturnValueOnce(Promise.resolve(previousInstallation))
      .mockReturnValueOnce(Promise.resolve(currentInstallation));

    (
      getInstallationObject as jest.MockedFunction<typeof getInstallationObject>
    ).mockReturnValueOnce(
      Promise.resolve({
        attributes: { installed_es: [] },
      } as unknown as SavedObject<Installation>)
    );

    await installTransforms({
      packageInstallContext: {
        packageInfo: {
          name: 'endpoint',
          version: '0.16.0-dev.0',
          data_streams: [
            {
              type: 'metrics',
              dataset: 'endpoint.metadata_current',
              title: 'Endpoint Metadata',
              release: 'experimental',
              package: 'endpoint',
              ingest_pipeline: 'default',
              elasticsearch: {
                'index_template.mappings': {
                  dynamic: false,
                },
              },
              path: 'metadata_current',
            },
          ],
        },
        paths: ['endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/default.json'],
        assetsMap: new Map([
          [
            'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/default.json',
            Buffer.from('{"content": "data"}'),
          ],
        ]),
      } as unknown as PackageInstallContext,
      esClient,
      savedObjectsClient,
      logger: loggerMock.create(),
      esReferences: previousInstallation.installed_es,
    });

    const meta = getESAssetMetadata({ packageName: 'endpoint' });

    expect(esClient.transform.putTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.16.0-dev.0',
          defer_validation: true,
          body: { content: 'data', _meta: meta },
        },
        { ignore: [409] },
      ],
    ]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.16.0-dev.0',
        },
        { ignore: [409] },
      ],
    ]);

    expect(savedObjectsClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [
            { id: 'endpoint.metadata_current-default-0.16.0-dev.0', type: 'transform' },
          ],
        },
        {
          refresh: false,
        },
      ],
    ]);
  });

  test('can removes older version when no new install in package', async () => {
    const previousInstallation: Installation = {
      installed_es: [
        {
          id: 'endpoint.metadata-current-default-0.15.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown as Installation;

    const currentInstallation: Installation = {
      installed_es: [],
    } as unknown as Installation;

    (getInstallation as jest.MockedFunction<typeof getInstallation>)
      .mockReturnValueOnce(Promise.resolve(previousInstallation))
      .mockReturnValueOnce(Promise.resolve(currentInstallation));

    (
      getInstallationObject as jest.MockedFunction<typeof getInstallationObject>
    ).mockReturnValueOnce(
      Promise.resolve({
        attributes: { installed_es: currentInstallation.installed_es },
      } as unknown as SavedObject<Installation>)
    );

    esClient.transform.getTransform.mockResponseOnce({
      count: 1,
      transforms: [
        // @ts-expect-error incomplete data
        {
          dest: {
            index: 'index',
          },
        },
      ],
    });

    await installTransforms({
      packageInstallContext: {
        packageInfo: {
          name: 'endpoint',
          version: '0.16.0-dev.0',
          data_streams: [
            {
              type: 'metrics',
              dataset: 'endpoint.metadata',
              title: 'Endpoint Metadata',
              release: 'experimental',
              package: 'endpoint',
              ingest_pipeline: 'default',
              elasticsearch: {
                'index_template.mappings': {
                  dynamic: false,
                },
              },
              path: 'metadata',
            },
            {
              type: 'metrics',
              dataset: 'endpoint.metadata_current',
              title: 'Endpoint Metadata Current',
              release: 'experimental',
              package: 'endpoint',
              ingest_pipeline: 'default',
              elasticsearch: {
                'index_template.mappings': {
                  dynamic: false,
                },
              },
              path: 'metadata_current',
            },
          ],
        },
        paths: [],
      } as unknown as PackageInstallContext,
      esClient,
      savedObjectsClient,
      logger: loggerMock.create(),
      esReferences: previousInstallation.installed_es,
    });

    expect(esClient.transform.stopTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata-current-default-0.15.0-dev.0',
          force: true,
        },
        { ignore: [404] },
      ],
    ]);

    expect(esClient.transform.deleteTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata-current-default-0.15.0-dev.0',
          force: true,
          delete_dest_index: true,
        },
        { ignore: [404] },
      ],
    ]);

    expect(savedObjectsClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [],
        },
        {
          refresh: false,
        },
      ],
    ]);
  });

  test('ignore already exists error if saved object and ES transforms are out of sync', async () => {
    const previousInstallation: Installation = {
      installed_es: [],
    } as unknown as Installation;

    const currentInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.metadata-current-default-0.16.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown as Installation;
    (getInstallation as jest.MockedFunction<typeof getInstallation>)
      .mockReturnValueOnce(Promise.resolve(previousInstallation))
      .mockReturnValueOnce(Promise.resolve(currentInstallation));

    (
      getInstallationObject as jest.MockedFunction<typeof getInstallationObject>
    ).mockReturnValueOnce(
      Promise.resolve({
        attributes: { installed_es: [] },
      } as unknown as SavedObject<Installation>)
    );

    esClient.transport.request.mockImplementationOnce(() =>
      elasticsearchClientMock.createErrorTransportRequestPromise(
        new errors.ResponseError(
          elasticsearchClientMock.createApiResponse({
            statusCode: 400,
            body: { error: { type: 'resource_already_exists_exception' } },
          })
        )
      )
    );

    await installTransforms({
      packageInstallContext: {
        packageInfo: {
          name: 'endpoint',
          version: '0.16.0-dev.0',
          data_streams: [
            {
              type: 'metrics',
              dataset: 'endpoint.metadata_current',
              title: 'Endpoint Metadata',
              release: 'experimental',
              package: 'endpoint',
              ingest_pipeline: 'default',
              elasticsearch: {
                'index_template.mappings': {
                  dynamic: false,
                },
              },
              path: 'metadata_current',
            },
          ],
        },
        paths: ['endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/default.json'],
        assetsMap: new Map([
          [
            'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/default.json',
            Buffer.from('{"content": "data"}'),
          ],
        ]),
      } as unknown as PackageInstallContext,
      esClient,
      savedObjectsClient,
      logger: loggerMock.create(),
      esReferences: previousInstallation.installed_es,
    });

    const meta = getESAssetMetadata({ packageName: 'endpoint' });

    expect(esClient.transform.putTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.16.0-dev.0',
          defer_validation: true,
          body: { content: 'data', _meta: meta },
        },
        { ignore: [409] },
      ],
    ]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([
      [{ transform_id: 'endpoint.metadata_current-default-0.16.0-dev.0' }, { ignore: [409] }],
    ]);

    expect(savedObjectsClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [
            { id: 'endpoint.metadata_current-default-0.16.0-dev.0', type: 'transform' },
          ],
        },
        {
          refresh: false,
        },
      ],
    ]);
  });
});
