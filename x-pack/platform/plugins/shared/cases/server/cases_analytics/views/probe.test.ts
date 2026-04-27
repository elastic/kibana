/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { probeViewSupport } from './probe';

describe('probeViewSupport', () => {
  const makeArgs = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggingSystemMock.createLogger();
    return { esClient, logger };
  };

  it('returns true when ES responds 200 to GET /_query/view', async () => {
    const { esClient, logger } = makeArgs();
    esClient.transport.request.mockResolvedValueOnce({
      statusCode: 200,
      body: { views: [] },
    });
    expect(await probeViewSupport(esClient, logger)).toBe(true);
    expect(esClient.transport.request).toHaveBeenCalledWith(
      { method: 'GET', path: '/_query/view' },
      { meta: true }
    );
  });

  it('returns false on 404 (older cluster / serverless / feature not yet shipped) and logs at debug only', async () => {
    /*
     * FAILURE SCENARIO: ES does not yet expose _query/view. We must NOT log
     * an error or break plugin start — the legacy analytics indices path
     * must continue to work. A debug log is acceptable for diagnosis.
     */
    const { esClient, logger } = makeArgs();
    const error = new EsErrors.ResponseError({
      statusCode: 404,
      body: { error: { type: 'feature_not_found' } },
      headers: {},
      meta: {} as never,
      warnings: null,
    });
    esClient.transport.request.mockRejectedValueOnce(error);

    expect(await probeViewSupport(esClient, logger)).toBe(false);
    expect(logger.debug).toHaveBeenCalledWith(
      'ES|QL views not supported by the connected cluster; falling back to the legacy analytics indices path'
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns false on any other error (transient cluster issue, auth) and logs at warn so operators can see it without breaking plugin start', async () => {
    /*
     * FAILURE SCENARIO: a 503 from ES during plugin start should not flip
     * us into views mode (we have not confirmed support) AND should not
     * crash — we degrade to the legacy path and log a warning.
     */
    const { esClient, logger } = makeArgs();
    const error = new EsErrors.ResponseError({
      statusCode: 503,
      body: { error: { type: 'service_unavailable' } },
      headers: {},
      meta: {} as never,
      warnings: null,
    });
    esClient.transport.request.mockRejectedValueOnce(error);

    expect(await probeViewSupport(esClient, logger)).toBe(false);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to probe ES|QL view support')
    );
  });

  it('returns false when transport throws a non-ES error (e.g. network failure)', async () => {
    const { esClient, logger } = makeArgs();
    esClient.transport.request.mockRejectedValueOnce(
      new Error('socket hang up')
    );
    expect(await probeViewSupport(esClient, logger)).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('socket hang up')
    );
  });
});
