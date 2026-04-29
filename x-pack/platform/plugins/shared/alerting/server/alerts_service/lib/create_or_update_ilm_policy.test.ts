/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { createOrUpdateIlmPolicy } from './create_or_update_ilm_policy';
import { getDataStreamAdapter } from './data_stream_adapter';

const randomDelayMultiplier = 0.01;
const logger = loggingSystemMock.createLogger();
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
const dataStreamAdapter = getDataStreamAdapter({ useDataStreamForAlerts: false });

const IlmPolicy = {
  _meta: {
    managed: true,
  },
  phases: {
    hot: {
      actions: {
        rollover: {
          max_age: '30d',
          max_primary_shard_size: '50gb',
        },
      },
    },
  },
};

describe('createOrUpdateIlmPolicy', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(global.Math, 'random').mockReturnValue(randomDelayMultiplier);
  });

  it(`should call esClient to put ILM policy`, async () => {
    await createOrUpdateIlmPolicy({
      logger,
      esClient: clusterClient,
      name: 'test-policy',
      policy: IlmPolicy,
      dataStreamAdapter,
    });

    expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith({
      name: 'test-policy',
      policy: IlmPolicy,
    });
  });

  it(`should retry on transient ES errors`, async () => {
    clusterClient.ilm.putLifecycle
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
      .mockResolvedValue({ acknowledged: true });
    await createOrUpdateIlmPolicy({
      logger,
      esClient: clusterClient,
      name: 'test-policy',
      policy: IlmPolicy,
      dataStreamAdapter,
    });

    expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledTimes(3);
  });

  it(`should log and throw error if max retries exceeded`, async () => {
    clusterClient.ilm.putLifecycle.mockRejectedValue(new EsErrors.ConnectionError('foo'));
    await expect(() =>
      createOrUpdateIlmPolicy({
        logger,
        esClient: clusterClient,
        name: 'test-policy',
        policy: IlmPolicy,
        dataStreamAdapter,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"foo"`);

    expect(logger.error).toHaveBeenCalledWith(`Error installing ILM policy test-policy - foo`);
    expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledTimes(4);
  });

  it(`should log and throw error if ES throws error`, async () => {
    clusterClient.ilm.putLifecycle.mockRejectedValue(new Error('generic error'));

    await expect(() =>
      createOrUpdateIlmPolicy({
        logger,
        esClient: clusterClient,
        name: 'test-policy',
        policy: IlmPolicy,
        dataStreamAdapter,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"generic error"`);

    expect(logger.error).toHaveBeenCalledWith(
      `Error installing ILM policy test-policy - generic error`
    );
  });
});
