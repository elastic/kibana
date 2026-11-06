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

  it(`should call esClient to put ILM policy, stamped with a content hash`, async () => {
    await createOrUpdateIlmPolicy({
      logger,
      esClient: clusterClient,
      name: 'test-policy',
      policy: IlmPolicy,
      dataStreamAdapter,
    });

    expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith({
      name: 'test-policy',
      policy: {
        ...IlmPolicy,
        _meta: {
          managed: true,
          content_hash: expect.stringMatching(/^[0-9a-f]{16}$/),
        },
      },
    });
  });

  it(`should skip the PUT when the installed content hash matches`, async () => {
    // First install to capture the hash this policy stamps.
    await createOrUpdateIlmPolicy({
      logger,
      esClient: clusterClient,
      name: 'test-policy',
      policy: IlmPolicy,
      dataStreamAdapter,
    });
    const installedHash = (
      clusterClient.ilm.putLifecycle.mock.calls[0][0] as unknown as {
        policy: { _meta: { content_hash: string } };
      }
    ).policy._meta.content_hash;
    clusterClient.ilm.putLifecycle.mockClear();

    clusterClient.ilm.getLifecycle.mockResolvedValue({
      'test-policy': { policy: { _meta: { managed: true, content_hash: installedHash } } },
    } as unknown as Awaited<ReturnType<typeof clusterClient.ilm.getLifecycle>>);

    await createOrUpdateIlmPolicy({
      logger,
      esClient: clusterClient,
      name: 'test-policy',
      policy: IlmPolicy,
      dataStreamAdapter,
    });

    expect(clusterClient.ilm.putLifecycle).not.toHaveBeenCalled();
  });

  it(`should PUT when the installed content hash differs`, async () => {
    clusterClient.ilm.getLifecycle.mockResolvedValue({
      'test-policy': { policy: { _meta: { managed: true, content_hash: 'stale-hash' } } },
    } as unknown as Awaited<ReturnType<typeof clusterClient.ilm.getLifecycle>>);

    await createOrUpdateIlmPolicy({
      logger,
      esClient: clusterClient,
      name: 'test-policy',
      policy: IlmPolicy,
      dataStreamAdapter,
    });

    expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledTimes(1);
  });

  it(`should PUT when the installed policy carries no content hash`, async () => {
    clusterClient.ilm.getLifecycle.mockResolvedValue({
      'test-policy': { policy: { _meta: { managed: true } } },
    } as unknown as Awaited<ReturnType<typeof clusterClient.ilm.getLifecycle>>);

    await createOrUpdateIlmPolicy({
      logger,
      esClient: clusterClient,
      name: 'test-policy',
      policy: IlmPolicy,
      dataStreamAdapter,
    });

    expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledTimes(1);
  });

  it(`should PUT when the installed policy cannot be read`, async () => {
    clusterClient.ilm.getLifecycle.mockRejectedValue(new Error('security_exception'));

    await createOrUpdateIlmPolicy({
      logger,
      esClient: clusterClient,
      name: 'test-policy',
      policy: IlmPolicy,
      dataStreamAdapter,
    });

    expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      `Could not read installed ILM policy test-policy content hash; will install (security_exception)`
    );
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
