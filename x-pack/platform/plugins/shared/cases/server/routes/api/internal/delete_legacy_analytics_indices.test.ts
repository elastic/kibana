/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
} from '@kbn/core/server/mocks';
import { DELETE_LEGACY_ANALYTICS_INDICES_API_TAG } from '../../../../common/constants';
import {
  DELETE_LEGACY_ANALYTICS_INDICES_INTERNAL_URL,
  deleteLegacyAnalyticsIndicesRoute,
} from './delete_legacy_analytics_indices';

const makeContext = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const context = {
    core: Promise.resolve({
      elasticsearch: { client: { asInternalUser: esClient } },
    } as never),
  };
  return { context, esClient };
};

const invoke = async (esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>) => {
  const response = httpServerMock.createResponseFactory();
  await deleteLegacyAnalyticsIndicesRoute.handler({
    response,
    request: httpServerMock.createKibanaRequest(),
    context: {
      core: Promise.resolve({
        elasticsearch: { client: { asInternalUser: esClient } },
      } as never),
    } as never,
    logger: {} as never,
    kibanaVersion: '0',
  });
  return response;
};

describe('DELETE /internal/cases/_analytics/legacy_indices', () => {
  it('is registered as an internal DELETE on the documented URL', () => {
    expect(deleteLegacyAnalyticsIndicesRoute.method).toBe('delete');
    expect(deleteLegacyAnalyticsIndicesRoute.path).toBe(
      DELETE_LEGACY_ANALYTICS_INDICES_INTERNAL_URL
    );
    expect(deleteLegacyAnalyticsIndicesRoute.routerOptions?.access).toBe('internal');
  });

  it('gates access via the all-tier API tag (bundled only into the cases all privilege)', () => {
    expect(deleteLegacyAnalyticsIndicesRoute.security).toEqual({
      authz: { requiredPrivileges: [DELETE_LEGACY_ANALYTICS_INDICES_API_TAG] },
    });
  });

  it('lists every legacy index matching the cleanup pattern and deletes them', async () => {
    const { esClient } = makeContext();
    esClient.indices.get.mockResolvedValueOnce({
      '.internal.cases.securitysolution-default': {} as never,
      '.cases-analytics.elastic-default': {} as never,
      '.internal.cases-analytics.elastic-default-000001': {} as never,
    });
    esClient.transform.getTransform.mockResolvedValueOnce({
      count: 0,
      transforms: [],
    });

    const response = await invoke(esClient);

    expect(esClient.indices.get).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.cases-analytics*,.internal.cases-analytics*,.internal.cases.*',
        allow_no_indices: true,
        ignore_unavailable: true,
      })
    );
    expect(esClient.indices.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        index: [
          '.internal.cases.securitysolution-default',
          '.cases-analytics.elastic-default',
          '.internal.cases-analytics.elastic-default-000001',
        ],
        ignore_unavailable: true,
      })
    );

    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.deletedIndices).toEqual([
      '.internal.cases.securitysolution-default',
      '.cases-analytics.elastic-default',
      '.internal.cases-analytics.elastic-default-000001',
    ]);
    expect(body.deletedTransforms).toEqual([]);
  });

  it('does not call indices.delete when no legacy indices match the pattern', async () => {
    const { esClient } = makeContext();
    esClient.indices.get.mockResolvedValueOnce({});
    esClient.transform.getTransform.mockResolvedValueOnce({
      count: 0,
      transforms: [],
    });

    const response = await invoke(esClient);
    expect(esClient.indices.delete).not.toHaveBeenCalled();
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.deletedIndices).toEqual([]);
  });

  it('stops + deletes any matching lifecycle pivot transforms (PR #257780 compat)', async () => {
    const { esClient } = makeContext();
    esClient.indices.get.mockResolvedValueOnce({});
    esClient.transform.getTransform.mockResolvedValueOnce({
      count: 1,
      transforms: [
        { id: 'cases-analytics-lifecycle-default-securitysolution' } as never,
      ],
    });

    const response = await invoke(esClient);
    expect(esClient.transform.stopTransform).toHaveBeenCalledWith(
      expect.objectContaining({
        transform_id: 'cases-analytics-lifecycle-default-securitysolution',
        force: true,
        wait_for_completion: true,
      })
    );
    expect(esClient.transform.deleteTransform).toHaveBeenCalledWith(
      expect.objectContaining({
        transform_id: 'cases-analytics-lifecycle-default-securitysolution',
        force: true,
      })
    );
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.deletedTransforms).toEqual([
      'cases-analytics-lifecycle-default-securitysolution',
    ]);
  });

  it('returns deletedTransforms=[] when the transform endpoint 404s, rather than failing the whole route', async () => {
    /*
     * FAILURE SCENARIO: cluster never had the lifecycle transform installed
     * (older deployment, pre-PR-257780). The route should still succeed
     * for the index-cleanup half of the contract.
     */
    const { esClient } = makeContext();
    esClient.indices.get.mockResolvedValueOnce({});
    esClient.transform.getTransform.mockRejectedValueOnce(
      Object.assign(new Error('not found'), { statusCode: 404 })
    );

    const response = await invoke(esClient);
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.deletedTransforms).toEqual([]);
    // The index half still completed.
    expect(body.deletedIndices).toEqual([]);
  });
});
