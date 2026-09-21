/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import {
  ALERTING_V2_ENABLED_SETTING_ID,
  ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID,
} from '@kbn/alerting-v2-constants';
import { SettingsService } from './settings_service';

describe('SettingsService', () => {
  let globalClient: ReturnType<typeof uiSettingsServiceMock.createClient>;
  let spaceClient: ReturnType<typeof uiSettingsServiceMock.createClient>;
  let service: SettingsService;

  beforeEach(() => {
    globalClient = uiSettingsServiceMock.createClient();
    spaceClient = uiSettingsServiceMock.createClient();
    service = new SettingsService(globalClient, spaceClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('reads alerting:v2:enabled from the global client', async () => {
      globalClient.get.mockResolvedValue(true);

      const result = await service.get(ALERTING_V2_ENABLED_SETTING_ID);

      expect(globalClient.get).toHaveBeenCalledWith(ALERTING_V2_ENABLED_SETTING_ID);
      expect(spaceClient.get).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('reads alerting:v2:experimentalFeatures from the space client', async () => {
      spaceClient.get.mockResolvedValue(true);

      const result = await service.get(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID);

      expect(spaceClient.get).toHaveBeenCalledWith(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID);
      expect(globalClient.get).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('propagates errors from the underlying client', async () => {
      const error = new Error('failed to read setting');
      globalClient.get.mockRejectedValue(error);

      await expect(service.get(ALERTING_V2_ENABLED_SETTING_ID)).rejects.toThrow(
        'failed to read setting'
      );
    });
  });

  describe('set', () => {
    it('writes alerting:v2:enabled with the global client', async () => {
      globalClient.set.mockResolvedValue(undefined);

      await service.set(ALERTING_V2_ENABLED_SETTING_ID, false);

      expect(globalClient.set).toHaveBeenCalledWith(ALERTING_V2_ENABLED_SETTING_ID, false);
      expect(spaceClient.set).not.toHaveBeenCalled();
    });

    it('writes alerting:v2:experimentalFeatures with the space client', async () => {
      spaceClient.set.mockResolvedValue(undefined);

      await service.set(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID, true);

      expect(spaceClient.set).toHaveBeenCalledWith(
        ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID,
        true
      );
      expect(globalClient.set).not.toHaveBeenCalled();
    });

    it('propagates errors from the underlying client', async () => {
      const error = new Error('failed to write setting');
      globalClient.set.mockRejectedValue(error);

      await expect(service.set(ALERTING_V2_ENABLED_SETTING_ID, true)).rejects.toThrow(
        'failed to write setting'
      );
    });
  });
});
