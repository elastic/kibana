/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { SlackAppService } from './service';
import { createElasticAppsSlackConnectorPoller } from './connector_poller';

const reconcileConnector = jest.spyOn(SlackAppService.prototype, 'reconcileConnector');

const INTERVAL_MS = 60_000;

const createPoller = () => {
  const logger = { warn: jest.fn(), get: jest.fn() } as unknown as jest.Mocked<Logger>;
  (logger.get as jest.Mock).mockReturnValue(logger);
  const soClient = {} as SavedObjectsClientContract;

  return {
    logger,
    soClient,
    poller: createElasticAppsSlackConnectorPoller({
      server: { logger } as unknown as StreamsServer,
      logger,
      soClient,
      intervalMs: INTERVAL_MS,
    }),
  };
};

describe('createElasticAppsSlackConnectorPoller', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reconcileConnector.mockReset();
    reconcileConnector.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing until subscribed', async () => {
    createPoller();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS * 3);

    expect(reconcileConnector).not.toHaveBeenCalled();
  });

  it('reconciles on the first tick, so a restart restores the connector', async () => {
    const { poller, soClient } = createPoller();

    const subscription = poller.subscribe();
    await jest.advanceTimersByTimeAsync(0);

    expect(reconcileConnector).toHaveBeenCalledWith(soClient);
    subscription.unsubscribe();
  });

  it('keeps reconciling on the interval', async () => {
    const { poller } = createPoller();
    const subscription = poller.subscribe();

    await jest.advanceTimersByTimeAsync(INTERVAL_MS * 2);

    expect(reconcileConnector).toHaveBeenCalledTimes(3);
    subscription.unsubscribe();
  });

  it('skips a tick that lands while the previous pass is still running', async () => {
    const { poller } = createPoller();
    let releasePass = () => {};
    reconcileConnector.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        releasePass = resolve;
      })
    );

    const subscription = poller.subscribe();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS * 2);

    expect(reconcileConnector).toHaveBeenCalledTimes(1);

    releasePass();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(reconcileConnector).toHaveBeenCalledTimes(2);
    subscription.unsubscribe();
  });

  it('logs a failed pass and carries on', async () => {
    const { poller, logger } = createPoller();
    reconcileConnector.mockRejectedValueOnce(new Error('saved object unavailable'));

    const subscription = poller.subscribe();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to reconcile the Elastic Slack connector')
    );
    expect(reconcileConnector).toHaveBeenCalledTimes(2);
    subscription.unsubscribe();
  });

  it('stops on unsubscribe', async () => {
    const { poller } = createPoller();
    const subscription = poller.subscribe();
    await jest.advanceTimersByTimeAsync(0);

    subscription.unsubscribe();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS * 3);

    expect(reconcileConnector).toHaveBeenCalledTimes(1);
  });
});
