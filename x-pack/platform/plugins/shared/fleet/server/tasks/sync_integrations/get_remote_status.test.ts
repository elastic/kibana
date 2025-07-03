/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import fetch, { FetchError } from 'node-fetch';

import { loggerMock } from '@kbn/logging-mocks';
import type { Logger } from '@kbn/core/server';

import { appContextService } from '../../services/app_context';

import { outputService } from '../../services/output';
import type { Output } from '../../types';

import { FleetNotFoundError } from '../../errors';

import { licenseService } from '../../services/license';

import { getRemoteSyncedIntegrationsInfoByOutputId } from './get_remote_status';

jest.mock('../../services/app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
const mockedOutputService = outputService as jest.Mocked<typeof outputService>;

jest.mock('../../services/output');
jest.mock('node-fetch');

let mockedLogger: jest.Mocked<Logger>;

describe('getRemoteSyncedIntegrationsInfoByOutputId', () => {
  let soClientMock: any;
  const output: Output = {
    id: 'remote1',
    type: 'remote_elasticsearch',
    hosts: ['http://elasticsearch:9200'],
    is_default: true,
    is_default_monitoring: true,
    name: 'Remote Output',
  };
  const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

  const statusRes = {
    integrations: [
      {
        package_name: 'system',
        package_version: '1.67.3',
        updated_at: '2025-03-20T14:18:40.111Z',
        sync_status: 'synchronizing',
      },
    ],
    custom_assets: {
      'ingest_pipeline:logs-system.auth@custom': {
        name: 'logs-system.auth@custom',
        type: 'ingest_pipeline',
        package_name: 'system',
        package_version: '1.67.3',
        sync_status: 'synchronizing',
      },
    },
  };

  beforeEach(() => {
    soClientMock = savedObjectsClientMock.create();
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
    jest.spyOn(licenseService, 'isEnterprise').mockReturnValue(true);
  });

  afterEach(() => {
    mockedFetch.mockReset();
    jest.resetAllMocks();
  });

  it('should return empty integrations array if feature flag is not available', async () => {
    jest
      .spyOn(mockedAppContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: false } as any);
    expect(await getRemoteSyncedIntegrationsInfoByOutputId(soClientMock, 'remote1')).toEqual({
      integrations: [],
    });
  });

  it('should return empty integrations array if license is not at least Enterprise', async () => {
    jest
      .spyOn(mockedAppContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);
    jest.spyOn(licenseService, 'isEnterprise').mockReturnValue(false);

    expect(await getRemoteSyncedIntegrationsInfoByOutputId(soClientMock, 'remote1')).toEqual({
      integrations: [],
    });
  });

  it('should return response with error if the passed outputId is not found', async () => {
    jest
      .spyOn(mockedAppContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);
    mockedOutputService.get.mockRejectedValue({ isBoom: true, output: { statusCode: 404 } } as any);

    expect(
      await getRemoteSyncedIntegrationsInfoByOutputId(soClientMock, 'remote-es-not-existent')
    ).toEqual({ error: 'No output found with id remote-es-not-existent', integrations: [] });
  });

  it('should throw error if the passed outputId is not of type remote_elasticsearch', async () => {
    const outputEs = {
      id: 'not_remote',
      type: 'elasticsearch',
      hosts: ['http://elasticsearch:9200'],
      is_default: true,
      is_default_monitoring: true,
      name: 'ES Output',
    } as any;
    jest
      .spyOn(mockedAppContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);
    mockedOutputService.get.mockResolvedValue(outputEs);

    await expect(
      getRemoteSyncedIntegrationsInfoByOutputId(soClientMock, 'not_remote')
    ).rejects.toThrowError('Output not_remote is not a remote elasticsearch output');
  });

  it('should throw error if the output has sync_integrations = false', async () => {
    jest
      .spyOn(mockedAppContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);
    mockedOutputService.get.mockResolvedValue({ ...output, sync_integrations: false } as any);

    await expect(
      getRemoteSyncedIntegrationsInfoByOutputId(soClientMock, 'remote1')
    ).rejects.toThrowError('Synced integrations not enabled');
  });

  it('should throw error if kibanaUrl is not present', async () => {
    jest
      .spyOn(mockedAppContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);
    mockedOutputService.get.mockResolvedValue({ ...output, sync_integrations: true } as any);

    await expect(
      getRemoteSyncedIntegrationsInfoByOutputId(soClientMock, 'remote1')
    ).rejects.toThrowError(new FleetNotFoundError('Remote Kibana URL not set on the output.'));
  });

  it('should throw error if kibanaApiKey is not present', async () => {
    jest
      .spyOn(mockedAppContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);
    mockedOutputService.get.mockResolvedValue({
      ...output,
      sync_integrations: true,
      kibana_url: 'http://remote-kibana-host',
    } as any);

    await expect(
      getRemoteSyncedIntegrationsInfoByOutputId(soClientMock, 'remote1')
    ).rejects.toThrowError(
      new FleetNotFoundError('Remote Kibana API key for http://remote-kibana-host not found')
    );
  });

  it('should return an error if it cannot establish a connection with remote kibana', async () => {
    jest
      .spyOn(mockedAppContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);
    mockedOutputService.get.mockResolvedValue({
      ...output,
      sync_integrations: true,
      kibana_url: 'http://remote-kibana-host',
      kibana_api_key: 'APIKEY',
    } as any);

    mockedFetch.mockImplementation(() => {
      throw new Error(
        `request to http://remote-kibana-host/api/fleet/remote_synced_integrations/status failed, reason: getaddrinfo ENOTFOUND remote-kibana-host`
      );
    });

    expect(await getRemoteSyncedIntegrationsInfoByOutputId(soClientMock, 'remote1')).toEqual({
      integrations: [],
      error:
        'GET http://remote-kibana-host/api/fleet/remote_synced_integrations/status failed with error: request to http://remote-kibana-host/api/fleet/remote_synced_integrations/status failed, reason: getaddrinfo ENOTFOUND remote-kibana-host',
    });
  });

  it('should return the response from the remote status api', async () => {
    jest
      .spyOn(mockedAppContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);
    mockedOutputService.get.mockResolvedValue({
      ...output,
      sync_integrations: true,
      kibana_url: 'http://remote-kibana-host',
      kibana_api_key: 'APIKEY',
    } as any);

    mockedFetch.mockResolvedValueOnce({
      json: () => statusRes,
      status: 200,
      ok: true,
    } as any);

    expect(await getRemoteSyncedIntegrationsInfoByOutputId(soClientMock, 'remote1')).toEqual(
      statusRes
    );
  });

  it('should not throw if the remote status api has errors in the body', async () => {
    jest
      .spyOn(mockedAppContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);
    mockedOutputService.get.mockResolvedValue({
      ...output,
      sync_integrations: true,
      kibana_url: 'http://remote-kibana-host',
      kibana_api_key: 'APIKEY',
    } as any);
    const statusWithErrorRes = {
      statusCode: 404,
      error: 'Not Found',
      message: 'No integrations found on fleet-synced-integrations-ccr-*',
    };

    mockedFetch.mockResolvedValueOnce({
      json: () => statusWithErrorRes,
      status: 200,
      ok: true,
    } as any);

    expect(await getRemoteSyncedIntegrationsInfoByOutputId(soClientMock, 'remote1')).toEqual({
      integrations: [],
      error:
        'GET http://remote-kibana-host/api/fleet/remote_synced_integrations/status failed with status 404. No integrations found on fleet-synced-integrations-ccr-*',
    });
  });

  it('should return an error if the remote api returns error', async () => {
    jest
      .spyOn(mockedAppContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);
    mockedOutputService.get.mockResolvedValue({
      ...output,
      sync_integrations: true,
      kibana_url: 'http://remote-kibana-host',
      kibana_api_key: 'APIKEY',
    } as any);

    mockedFetch.mockImplementation(() => {
      throw new Error(`some error`);
    });
    expect(await getRemoteSyncedIntegrationsInfoByOutputId(soClientMock, 'remote1')).toEqual({
      integrations: [],
      error:
        'GET http://remote-kibana-host/api/fleet/remote_synced_integrations/status failed with error: some error',
    });
  });

  it('should return error if the fetch returns invalid-json error', async () => {
    jest
      .spyOn(mockedAppContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);
    mockedOutputService.get.mockResolvedValue({
      ...output,
      sync_integrations: true,
      kibana_url: 'http://remote-kibana-host/invalid',
      kibana_api_key: 'APIKEY',
    } as any);

    mockedFetch.mockResolvedValueOnce({
      json: () => {
        const err = new FetchError(`some error`, 'invalid-json');
        err.type = 'invalid-json';
        err.message = `some error`;
        throw err;
      },
      status: 404,
      statusText: 'Not Found',
    } as any);
    expect(await getRemoteSyncedIntegrationsInfoByOutputId(soClientMock, 'remote1')).toEqual({
      integrations: [],
      error:
        'GET http://remote-kibana-host/invalid/api/fleet/remote_synced_integrations/status failed with status 404. some error',
    });
  });
});
