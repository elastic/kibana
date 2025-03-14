/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createOrUpdateFleetSyncedIntegrationsIndex } from './fleet_synced_integrations';

jest.mock('../app_context', () => ({
  appContextService: {
    getExperimentalFeatures: jest.fn().mockReturnValue({ enableSyncIntegrationsOnRemote: true }),
  },
}));

describe('fleet_synced_integrations', () => {
  let esClientMock: any;
  const mockExists = jest.fn();
  const mockGetMapping = jest.fn();

  beforeEach(() => {
    esClientMock = {
      indices: {
        create: jest.fn(),
        exists: mockExists,
        getMapping: mockGetMapping,
        putMapping: jest.fn(),
      },
    };
  });

  it('should create index if not exists', async () => {
    mockExists.mockResolvedValue(false);

    await createOrUpdateFleetSyncedIntegrationsIndex(esClientMock);

    expect(esClientMock.indices.create).toHaveBeenCalled();
  });

  it('should update index if older version exists', async () => {
    mockExists.mockResolvedValue(true);
    mockGetMapping.mockResolvedValue({
      'fleet-synced-integrations': {
        mappings: {
          _meta: {
            version: '0.0',
          },
        },
      },
    });

    await createOrUpdateFleetSyncedIntegrationsIndex(esClientMock);

    expect(esClientMock.indices.putMapping).toHaveBeenCalled();
  });

  it('should not update index if same version exists', async () => {
    mockExists.mockResolvedValue(true);
    mockGetMapping.mockResolvedValue({
      'fleet-synced-integrations': {
        mappings: {
          _meta: {
            version: '1.0',
          },
        },
      },
    });

    await createOrUpdateFleetSyncedIntegrationsIndex(esClientMock);

    expect(esClientMock.indices.putMapping).not.toHaveBeenCalled();
  });
});
