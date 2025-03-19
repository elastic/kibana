/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

import { appContextService } from '../app_context';

import { getSpaceSettings, saveSpaceSettings } from './space_settings';

jest.mock('../app_context');

describe('saveSpaceSettings', () => {
  function createSavedsClientMock(settingsAttributes?: any) {
    const client = savedObjectsClientMock.create();

    if (settingsAttributes) {
      client.get.mockResolvedValue({
        attributes: settingsAttributes,
      } as any);
    } else {
      client.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('Not found')
      );
    }

    jest.mocked(appContextService.getInternalUserSOClientForSpaceId).mockReturnValue(client);

    return client;
  }
  describe('saved managedBy settings', () => {
    it('should work if saved with managedBy:kibana_config and previous settings did not exists', async () => {
      const soClient = createSavedsClientMock();
      await saveSpaceSettings({
        spaceId: 'test',
        managedBy: 'kibana_config',
        settings: {
          allowed_namespace_prefixes: ['test'],
          managed_by: 'kibana_config',
        },
      });
      expect(soClient.update).toBeCalledWith(
        'fleet-space-settings',
        'test-default-settings',
        { allowed_namespace_prefixes: ['test'], managed_by: 'kibana_config' },
        expect.anything()
      );
    });

    it('should work if saved with managedBy:kibana_config and previous settings is managedBy:kibana_config', async () => {
      const soClient = createSavedsClientMock({
        managed_by: 'kibana_config',
      });
      await saveSpaceSettings({
        spaceId: 'test',
        managedBy: 'kibana_config',
        settings: {
          allowed_namespace_prefixes: ['test'],
          managed_by: 'kibana_config',
        },
      });
      expect(soClient.update).toBeCalledWith(
        'fleet-space-settings',
        'test-default-settings',
        { allowed_namespace_prefixes: ['test'], managed_by: 'kibana_config' },
        expect.anything()
      );
    });

    it('should work if saved with managedBy:kibana_config and previous settings is not managedBy:kibana_config', async () => {
      const so = createSavedsClientMock({});
      await saveSpaceSettings({
        spaceId: 'test',
        managedBy: 'kibana_config',
        settings: {
          allowed_namespace_prefixes: ['test'],
          managed_by: 'kibana_config',
        },
      });
      expect(so.update).toBeCalledWith(
        'fleet-space-settings',
        'test-default-settings',
        { allowed_namespace_prefixes: ['test'], managed_by: 'kibana_config' },
        expect.anything()
      );
    });

    it('should throw if called without managedBy:kibana_config and previous settings is managedBy:kibana_config', async () => {
      createSavedsClientMock({ managed_by: 'kibana_config' });
      await expect(
        saveSpaceSettings({
          spaceId: 'test',
          settings: {
            allowed_namespace_prefixes: ['test'],
          },
        })
      ).rejects.toThrowError(/Settings are managed by: kibana_config and should be edited there/);
    });
  });
});

describe('getSpaceSettings', () => {
  function createSavedsClientMock(settingsAttributes?: any) {
    const client = savedObjectsClientMock.create();

    if (settingsAttributes) {
      client.get.mockResolvedValue({
        attributes: settingsAttributes,
      } as any);
    } else {
      client.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('Not found')
      );
    }

    jest.mocked(appContextService.getInternalUserSOClientForSpaceId).mockReturnValue(client);

    return client;
  }
  it('should work with managedBy:null', async () => {
    createSavedsClientMock({
      allowed_namespace_prefixes: ['test'],
      managed_by: null,
    });
    const res = await getSpaceSettings();

    expect(res).toEqual({
      allowed_namespace_prefixes: ['test'],
      managed_by: undefined,
    });
  });
});
