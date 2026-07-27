/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { downloadSourceService } from '../download_source';
import { agentPolicyService } from '../agent_policy';

import {
  getPreconfiguredDownloadSourcesFromConfig,
  ensurePreconfiguredDownloadSources,
} from './download_source';

jest.mock('../download_source');
jest.mock('../agent_policy');

const mockedDownloadSourceService = downloadSourceService as jest.Mocked<
  typeof downloadSourceService
>;
const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

describe('getPreconfiguredDownloadSourcesFromConfig', () => {
  it('should return empty array when config is undefined', () => {
    const result = getPreconfiguredDownloadSourcesFromConfig(undefined);
    expect(result).toEqual([]);
  });

  it('should return empty array when binaryDownloadSource is not set', () => {
    const result = getPreconfiguredDownloadSourcesFromConfig({} as any);
    expect(result).toEqual([]);
  });

  it('should return preconfigured download sources with is_preconfigured: true', () => {
    const config = {
      binaryDownloadSource: [
        {
          id: 'ds-1',
          name: 'My Download Source',
          host: 'https://example.com/downloads',
          is_default: false,
        },
      ],
    };

    const result = getPreconfiguredDownloadSourcesFromConfig(config as any);

    expect(result).toEqual([
      {
        id: 'ds-1',
        name: 'My Download Source',
        host: 'https://example.com/downloads',
        is_default: false,
        is_preconfigured: true,
      },
    ]);
  });

  it('should include optional fields when provided', () => {
    const config = {
      binaryDownloadSource: [
        {
          id: 'ds-1',
          name: 'My Download Source',
          host: 'https://example.com/downloads',
          is_default: true,
          proxy_id: 'proxy-1',
          ssl: {
            certificate_authorities: ['ca-cert'],
            certificate: 'cert',
            key: 'key',
          },
        },
      ],
    };

    const result = getPreconfiguredDownloadSourcesFromConfig(config as any);

    expect(result).toEqual([
      {
        id: 'ds-1',
        name: 'My Download Source',
        host: 'https://example.com/downloads',
        is_default: true,
        proxy_id: 'proxy-1',
        ssl: {
          certificate_authorities: ['ca-cert'],
          certificate: 'cert',
          key: 'key',
        },
        is_preconfigured: true,
      },
    ]);
  });
});

describe('ensurePreconfiguredDownloadSources', () => {
  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createInternalClient();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAgentPolicyService.bumpAllAgentPoliciesForDownloadSource.mockResolvedValue(undefined as any);
  });

  it('should create a new download source if it does not exist', async () => {
    mockedDownloadSourceService.list.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10 });
    mockedDownloadSourceService.create.mockResolvedValue({
      id: 'ds-1',
      name: 'My Source',
      host: 'https://example.com',
      is_default: false,
      is_preconfigured: true,
    });

    const preconfiguredSources = [
      {
        id: 'ds-1',
        name: 'My Source',
        host: 'https://example.com',
        is_default: false,
        is_preconfigured: true,
      },
    ];

    await ensurePreconfiguredDownloadSources(soClient, esClient, preconfiguredSources);

    expect(mockedDownloadSourceService.create).toHaveBeenCalledWith(
      soClient,
      esClient,
      expect.objectContaining({ id: 'ds-1', name: 'My Source' }),
      { id: 'ds-1', overwrite: true }
    );
  });

  it('should update an existing download source when it has changed', async () => {
    const existingSource = {
      id: 'ds-1',
      name: 'Old Name',
      host: 'https://old.example.com',
      is_default: false,
      is_preconfigured: true,
    };
    mockedDownloadSourceService.list.mockResolvedValue({
      items: [existingSource],
      total: 1,
      page: 1,
      perPage: 10,
    });
    mockedDownloadSourceService.update.mockResolvedValue(undefined as any);

    const preconfiguredSources = [
      {
        id: 'ds-1',
        name: 'New Name',
        host: 'https://example.com',
        is_default: false,
        is_preconfigured: true,
      },
    ];

    await ensurePreconfiguredDownloadSources(soClient, esClient, preconfiguredSources);

    expect(mockedDownloadSourceService.update).toHaveBeenCalledWith(
      soClient,
      esClient,
      'ds-1',
      expect.objectContaining({ name: 'New Name', is_preconfigured: true })
    );
    expect(mockedAgentPolicyService.bumpAllAgentPoliciesForDownloadSource).toHaveBeenCalledWith(
      esClient,
      'ds-1',
      { isDefault: false }
    );
  });

  it('should not update an existing preconfigured source when nothing has changed', async () => {
    const existingSource = {
      id: 'ds-1',
      name: 'My Source',
      host: 'https://example.com',
      is_default: false,
      is_preconfigured: true,
    };
    mockedDownloadSourceService.list.mockResolvedValue({
      items: [existingSource],
      total: 1,
      page: 1,
      perPage: 10,
    });

    const preconfiguredSources = [
      {
        id: 'ds-1',
        name: 'My Source',
        host: 'https://example.com',
        is_default: false,
        is_preconfigured: true,
      },
    ];

    await ensurePreconfiguredDownloadSources(soClient, esClient, preconfiguredSources);

    expect(mockedDownloadSourceService.create).not.toHaveBeenCalled();
    expect(mockedDownloadSourceService.update).not.toHaveBeenCalled();
  });

  it('should unmark a removed preconfigured source as preconfigured', async () => {
    const existingSource = {
      id: 'ds-removed',
      name: 'Removed Source',
      host: 'https://removed.example.com',
      is_default: false,
      is_preconfigured: true,
    };
    mockedDownloadSourceService.list.mockResolvedValue({
      items: [existingSource],
      total: 1,
      page: 1,
      perPage: 10,
    });
    mockedDownloadSourceService.update.mockResolvedValue(undefined as any);

    // Empty preconfigured sources — the existing one was removed from config
    await ensurePreconfiguredDownloadSources(soClient, esClient, []);

    expect(mockedDownloadSourceService.update).toHaveBeenCalledWith(
      soClient,
      esClient,
      'ds-removed',
      { is_preconfigured: false }
    );
  });
});
