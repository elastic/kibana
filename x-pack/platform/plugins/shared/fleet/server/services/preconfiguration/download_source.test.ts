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

  it('should return empty array when binaryDownloadSource is empty', () => {
    const result = getPreconfiguredDownloadSourcesFromConfig({ binaryDownloadSource: [] } as any);
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
    mockedAgentPolicyService.bumpAllAgentPoliciesForDownloadSource.mockResolvedValue(
      undefined as any
    );
    mockedAgentPolicyService.agentPoliciesExistForDownloadSourceId.mockResolvedValue(false);
  });

  it('should create a new download source if it does not exist', async () => {
    mockedDownloadSourceService.list.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      perPage: 10,
    });
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
    // list() should only be called once
    expect(mockedDownloadSourceService.list).toHaveBeenCalledTimes(1);
  });

  it('should update an existing download source and bump policies when data has changed', async () => {
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

  it('should update is_preconfigured flag without bumping policies when only that flag differs', async () => {
    const existingSource = {
      id: 'ds-1',
      name: 'My Source',
      host: 'https://example.com',
      is_default: false,
      is_preconfigured: false,
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
        name: 'My Source',
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
      expect.objectContaining({ is_preconfigured: true })
    );
    expect(mockedAgentPolicyService.bumpAllAgentPoliciesForDownloadSource).not.toHaveBeenCalled();
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

  it('should delete a removed preconfigured source when not referenced by any agent policy', async () => {
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
    mockedAgentPolicyService.agentPoliciesExistForDownloadSourceId.mockResolvedValue(false);
    mockedDownloadSourceService.delete.mockResolvedValue(undefined as any);

    await ensurePreconfiguredDownloadSources(soClient, esClient, []);

    expect(mockedDownloadSourceService.delete).toHaveBeenCalledWith('ds-removed', {
      fromPreconfiguration: true,
    });
    expect(mockedDownloadSourceService.update).not.toHaveBeenCalled();
  });

  it('should unmark a removed preconfigured source when it is still referenced by agent policies', async () => {
    const existingSource = {
      id: 'ds-in-use',
      name: 'In-Use Source',
      host: 'https://in-use.example.com',
      is_default: false,
      is_preconfigured: true,
    };
    mockedDownloadSourceService.list.mockResolvedValue({
      items: [existingSource],
      total: 1,
      page: 1,
      perPage: 10,
    });
    mockedAgentPolicyService.agentPoliciesExistForDownloadSourceId.mockResolvedValue(true);
    mockedDownloadSourceService.update.mockResolvedValue(undefined as any);

    await ensurePreconfiguredDownloadSources(soClient, esClient, []);

    expect(mockedDownloadSourceService.update).toHaveBeenCalledWith(
      soClient,
      esClient,
      'ds-in-use',
      {
        is_preconfigured: false,
      }
    );
    expect(mockedDownloadSourceService.delete).not.toHaveBeenCalled();
  });

  it('should unmark a removed default preconfigured source instead of deleting it', async () => {
    const existingSource = {
      id: 'ds-default',
      name: 'Default Source',
      host: 'https://default.example.com',
      is_default: true,
      is_preconfigured: true,
    };
    mockedDownloadSourceService.list.mockResolvedValue({
      items: [existingSource],
      total: 1,
      page: 1,
      perPage: 10,
    });
    mockedAgentPolicyService.agentPoliciesExistForDownloadSourceId.mockResolvedValue(false);
    mockedDownloadSourceService.update.mockResolvedValue(undefined as any);

    await ensurePreconfiguredDownloadSources(soClient, esClient, []);

    expect(mockedDownloadSourceService.update).toHaveBeenCalledWith(
      soClient,
      esClient,
      'ds-default',
      {
        is_preconfigured: false,
      }
    );
    expect(mockedDownloadSourceService.delete).not.toHaveBeenCalled();
  });
});
