/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { getDataStreamDefaultRetentionPeriod } from '.';

describe('getDataStreamDefaultRetentionPeriod', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns persistent retention setting when available', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esClientMock.cluster.getSettings.mockResolvedValue({
      persistent: {
        data_streams: {
          lifecycle: {
            retention: {
              failures_default: '7d',
            },
          },
        },
      },
      transient: {},
      defaults: {},
    });

    const result = await getDataStreamDefaultRetentionPeriod({
      esClient: esClientMock,
    });

    expect(esClientMock.cluster.getSettings).toHaveBeenCalledWith({
      include_defaults: true,
    });
    expect(result).toBe('7d');
  });

  it('returns defaults retention setting when persistent is not available', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esClientMock.cluster.getSettings.mockResolvedValue({
      persistent: {},
      transient: {},
      defaults: {
        data_streams: {
          lifecycle: {
            retention: {
              failures_default: '30d',
            },
          },
        },
      },
    });

    const result = await getDataStreamDefaultRetentionPeriod({
      esClient: esClientMock,
    });

    expect(esClientMock.cluster.getSettings).toHaveBeenCalledWith({
      include_defaults: true,
    });
    expect(result).toBe('30d');
  });

  it('returns undefined when neither persistent nor defaults have retention settings', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esClientMock.cluster.getSettings.mockResolvedValue({
      persistent: {},
      transient: {},
      defaults: {},
    });

    const result = await getDataStreamDefaultRetentionPeriod({
      esClient: esClientMock,
    });

    expect(esClientMock.cluster.getSettings).toHaveBeenCalledWith({
      include_defaults: true,
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined when user lacks permissions (403 error)', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    const error = new Error('Forbidden');
    (error as any).meta = { statusCode: 403 };
    esClientMock.cluster.getSettings.mockRejectedValue(error);

    const result = await getDataStreamDefaultRetentionPeriod({
      esClient: esClientMock,
    });

    expect(esClientMock.cluster.getSettings).toHaveBeenCalledWith({
      include_defaults: true,
    });
    expect(result).toBeUndefined();
  });

  it('throws error for non-403 errors', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    const error = new Error('Internal Server Error');
    (error as any).meta = { statusCode: 500 };
    esClientMock.cluster.getSettings.mockRejectedValue(error);

    await expect(
      getDataStreamDefaultRetentionPeriod({
        esClient: esClientMock,
      })
    ).rejects.toThrow('Internal Server Error');

    expect(esClientMock.cluster.getSettings).toHaveBeenCalledWith({
      include_defaults: true,
    });
  });
});
