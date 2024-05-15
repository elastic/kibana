/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import Boom from '@hapi/boom';

import { GLOBAL_SETTINGS_ID, GLOBAL_SETTINGS_SAVED_OBJECT_TYPE } from '../../common/constants';

import type { Settings } from '../types';

import { appContextService } from './app_context';
import { getSettings, saveSettings, settingsSetup } from './settings';
import { auditLoggingService } from './audit_logging';
import { listFleetServerHosts } from './fleet_server_host';

jest.mock('./app_context');
jest.mock('./audit_logging');
jest.mock('./fleet_server_host');

const mockListFleetServerHosts = listFleetServerHosts as jest.MockedFunction<
  typeof listFleetServerHosts
>;
const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;
const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

describe('settingsSetup', () => {
  afterEach(() => {
    mockedAppContextService.getCloud.mockReset();
    mockedAppContextService.getConfig.mockReset();
  });
  it('should create settings if there is no settings', async () => {
    const soClientMock = savedObjectsClientMock.create();

    soClientMock.find.mockResolvedValue({
      total: 0,
      page: 0,
      per_page: 10,
      saved_objects: [],
    });

    soClientMock.create.mockResolvedValue({
      id: 'created',
      attributes: {},
      references: [],
      type: 'so_type',
    });

    await settingsSetup(soClientMock);

    expect(soClientMock.create).toBeCalled();
  });

  it('should do nothing if there is settings', async () => {
    const soClientMock = savedObjectsClientMock.create();

    soClientMock.find.mockResolvedValue({
      total: 1,
      page: 0,
      per_page: 10,
      saved_objects: [
        {
          id: 'defaultsettings',
          attributes: {},
          type: 'so_type',
          references: [],
          score: 0,
        },
      ],
    });

    soClientMock.create.mockResolvedValue({
      id: 'created',
      attributes: {},
      references: [],
      type: 'so_type',
    });

    mockListFleetServerHosts.mockResolvedValueOnce({
      items: [
        {
          id: 'fleet-server-host',
          name: 'Fleet Server Host',
          is_default: true,
          is_preconfigured: false,
          host_urls: ['http://localhost:8220'],
        },
      ],
      page: 1,
      perPage: 10,
      total: 1,
    });

    await settingsSetup(soClientMock);

    expect(soClientMock.create).not.toBeCalled();
  });
});

describe('getSettings', () => {
  it('should call audit logger', async () => {
    const soClient = savedObjectsClientMock.create();

    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: GLOBAL_SETTINGS_ID,
          attributes: {},
          references: [],
          type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
          score: 0,
        },
      ],
      page: 1,
      per_page: 10,
      total: 1,
    });

    mockListFleetServerHosts.mockResolvedValueOnce({
      items: [
        {
          id: 'fleet-server-host',
          name: 'Fleet Server Host',
          is_default: true,
          is_preconfigured: false,
          host_urls: ['http://localhost:8220'],
        },
      ],
      page: 1,
      perPage: 10,
      total: 1,
    });

    await getSettings(soClient);
  });
});

describe('saveSettings', () => {
  describe('when settings object exists', () => {
    it('should call audit logger', async () => {
      const soClient = savedObjectsClientMock.create();

      const newData: Partial<Omit<Settings, 'id'>> = {
        fleet_server_hosts: ['http://localhost:8220'],
      };

      soClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: GLOBAL_SETTINGS_ID,
            attributes: {},
            references: [],
            type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
            score: 0,
          },
        ],
        page: 1,
        per_page: 10,
        total: 1,
      });

      soClient.update.mockResolvedValueOnce({
        id: GLOBAL_SETTINGS_ID,
        attributes: {},
        references: [],
        type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      });

      mockListFleetServerHosts.mockResolvedValueOnce({
        items: [
          {
            id: 'fleet-server-host',
            name: 'Fleet Server Host',
            is_default: true,
            is_preconfigured: false,
            host_urls: ['http://localhost:8220'],
          },
        ],
        page: 1,
        perPage: 10,
        total: 1,
      });

      await saveSettings(soClient, newData);

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'create',
        id: GLOBAL_SETTINGS_ID,
        savedObjectType: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      });
    });

    describe('when settings object does not exist', () => {
      it('should call audit logger', async () => {
        const soClient = savedObjectsClientMock.create();

        const newData: Partial<Omit<Settings, 'id'>> = {
          fleet_server_hosts: ['http://localhost:8220'],
        };

        soClient.find.mockRejectedValueOnce(Boom.notFound('not found'));

        soClient.create.mockResolvedValueOnce({
          id: GLOBAL_SETTINGS_ID,
          attributes: {},
          references: [],
          type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
        });

        await saveSettings(soClient, newData);

        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
          action: 'create',
          id: GLOBAL_SETTINGS_ID,
          savedObjectType: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
        });
      });
    });
  });
});
