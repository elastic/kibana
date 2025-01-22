/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { Logger } from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import {
  GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
  DEFAULT_FLEET_SERVER_HOST_ID,
} from '../constants';

import { appContextService } from './app_context';

import { deleteFleetServerHost, migrateSettingsToFleetServerHost } from './fleet_server_host';
import { agentPolicyService } from './agent_policy';

jest.mock('./app_context');
jest.mock('./agent_policy');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

mockedAppContextService.getExperimentalFeatures.mockReturnValue({} as any);

let mockedLogger: jest.Mocked<Logger>;

describe('migrateSettingsToFleetServerHost', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
  });

  it('should not migrate settings if a default fleet server policy config exists', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockImplementation(({ type }) => {
      if (type === FLEET_SERVER_HOST_SAVED_OBJECT_TYPE) {
        return { saved_objects: [{ id: 'test123' }] } as any;
      }

      throw new Error('Not mocked');
    });

    await migrateSettingsToFleetServerHost(soClient);

    expect(soClient.create).not.toBeCalled();
  });

  it('should not migrate settings if there is not old settings', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockImplementation(({ type }) => {
      if (type === FLEET_SERVER_HOST_SAVED_OBJECT_TYPE) {
        return { saved_objects: [] } as any;
      }

      if (type === GLOBAL_SETTINGS_SAVED_OBJECT_TYPE) {
        return {
          saved_objects: [],
        } as any;
      }

      throw new Error('Not mocked');
    });

    soClient.create.mockResolvedValue({
      id: DEFAULT_FLEET_SERVER_HOST_ID,
      attributes: {},
    } as any);

    await migrateSettingsToFleetServerHost(soClient);
    expect(soClient.create).not.toBeCalled();
  });

  it('should migrate settings to new saved object', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockImplementation(({ type }) => {
      if (type === FLEET_SERVER_HOST_SAVED_OBJECT_TYPE) {
        return { saved_objects: [] } as any;
      }

      if (type === GLOBAL_SETTINGS_SAVED_OBJECT_TYPE) {
        return {
          saved_objects: [
            {
              attributes: {
                fleet_server_hosts: ['https://fleetserver:8220'],
              },
            },
          ],
        } as any;
      }

      throw new Error('Not mocked');
    });

    soClient.create.mockResolvedValue({
      id: DEFAULT_FLEET_SERVER_HOST_ID,
      attributes: {},
    } as any);

    await migrateSettingsToFleetServerHost(soClient);
    expect(soClient.create).toBeCalledWith(
      FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      expect.objectContaining({
        is_default: true,
        host_urls: ['https://fleetserver:8220'],
      }),
      expect.objectContaining({
        id: DEFAULT_FLEET_SERVER_HOST_ID,
      })
    );
  });
});

describe('deleteFleetServerHost', () => {
  it('should removeFleetServerHostFromAll agent policies without force if not deleted from preconfiguration', async () => {
    const soMock = savedObjectsClientMock.create();

    soMock.get.mockResolvedValue({
      id: 'test1',
      attributes: {},
    } as any);
    const esMock = elasticsearchServiceMock.createInternalClient();
    await deleteFleetServerHost(soMock, esMock, 'test1', {});

    expect(jest.mocked(agentPolicyService.removeFleetServerHostFromAll)).toBeCalledWith(
      esMock,
      'test1',
      {
        force: undefined,
      }
    );
  });
  it('should removeFleetServerHostFromAll agent policies with force if deleted from preconfiguration', async () => {
    const soMock = savedObjectsClientMock.create();

    soMock.get.mockResolvedValue({
      id: 'test1',
      attributes: {},
    } as any);
    const esMock = elasticsearchServiceMock.createInternalClient();
    await deleteFleetServerHost(soMock, esMock, 'test1', {
      fromPreconfiguration: true,
    });

    expect(jest.mocked(agentPolicyService.removeFleetServerHostFromAll)).toBeCalledWith(
      esMock,
      'test1',
      {
        force: true,
      }
    );
  });
});
