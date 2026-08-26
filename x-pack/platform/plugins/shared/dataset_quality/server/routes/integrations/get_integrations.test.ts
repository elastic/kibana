/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  FleetUnauthorizedError,
  PackageNotFoundError,
  RegistryResponseError,
} from '@kbn/fleet-plugin/server/errors';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import { getIntegrations } from './get_integrations';

const buildPackageClient = (getPackage: jest.Mock): PackageClient => {
  return {
    getPackages: jest.fn().mockResolvedValue([
      {
        name: 'apm',
        version: '9.3.0',
        title: 'APM',
        icons: [],
        status: 'installed',
        data_streams: [{ dataset: 'apm.error', title: 'APM errors' }],
      },
    ]),
    getPackage,
  } as unknown as PackageClient;
};

describe('getIntegrations / fetchDatasets error handling', () => {
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  it('logs RegistryResponseError 404 at debug, not error', async () => {
    const packageClient = buildPackageClient(
      jest
        .fn()
        .mockRejectedValue(
          new RegistryResponseError(`'404 Not Found' error response from package registry`, 404)
        )
    );

    const result = await getIntegrations({ packageClient, logger });

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    // fetchDatasets returns {} on the catch path → filtered out by getIntegrations.
    expect(result).toEqual([]);
  });

  it('logs FleetUnauthorizedError at debug, not error', async () => {
    const packageClient = buildPackageClient(
      jest
        .fn()
        .mockRejectedValue(
          new FleetUnauthorizedError(
            `User does not have adequate permissions to access Fleet packages.`
          )
        )
    );

    await getIntegrations({ packageClient, logger });

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('keeps RegistryResponseError 5xx at error level', async () => {
    const packageClient = buildPackageClient(
      jest.fn().mockRejectedValue(new RegistryResponseError('Bad Gateway', 502))
    );

    await getIntegrations({ packageClient, logger });

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('logs RegistryResponseError without a status at error level (no silent silencing)', async () => {
    const err = new RegistryResponseError('Bad Gateway');
    (err as unknown as { status: number | undefined }).status = undefined;
    const packageClient = buildPackageClient(jest.fn().mockRejectedValue(err));

    await getIntegrations({ packageClient, logger });

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('keeps unknown errors at error level', async () => {
    const packageClient = buildPackageClient(
      jest.fn().mockRejectedValue(new Error('something else broke'))
    );

    await getIntegrations({ packageClient, logger });

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('treats PackageNotFoundError as a custom integration (no log, empty datasets filter)', async () => {
    const packageClient = buildPackageClient(
      jest.fn().mockRejectedValue(new PackageNotFoundError('not found'))
    );

    const result = await getIntegrations({ packageClient, logger });

    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    // PackageNotFoundError → fetchDatasets returns null → falls back to package data_streams.
    expect(result).toEqual([expect.objectContaining({ name: 'apm' })]);
  });
});
