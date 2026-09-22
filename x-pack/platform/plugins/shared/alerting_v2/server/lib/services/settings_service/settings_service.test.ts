/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/alerting-v2-constants';
import { SettingsService } from './settings_service';

describe('SettingsService', () => {
  let spaceClient: ReturnType<typeof uiSettingsServiceMock.createClient>;
  let service: SettingsService;

  beforeEach(() => {
    spaceClient = uiSettingsServiceMock.createClient();
    service = new SettingsService(spaceClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('reads alerting:v2:experimentalFeatures from the space client', async () => {
      spaceClient.get.mockResolvedValue(true);

      const result = await service.get(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID);

      expect(spaceClient.get).toHaveBeenCalledTimes(1);
      expect(spaceClient.get).toHaveBeenCalledWith(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID);
      expect(result).toBe(true);
    });

    it('propagates errors from the underlying client', async () => {
      const error = new Error('failed to read setting');
      spaceClient.get.mockRejectedValue(error);

      await expect(service.get(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID)).rejects.toThrow(
        'failed to read setting'
      );
    });
  });

  describe('set', () => {
    it('writes alerting:v2:experimentalFeatures with the space client', async () => {
      spaceClient.set.mockResolvedValue(undefined);

      await service.set(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID, true);

      expect(spaceClient.set).toHaveBeenCalledTimes(1);
      expect(spaceClient.set).toHaveBeenCalledWith(
        ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID,
        true
      );
    });

    it('propagates errors from the underlying client', async () => {
      const error = new Error('failed to write setting');
      spaceClient.set.mockRejectedValue(error);

      await expect(service.set(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID, true)).rejects.toThrow(
        'failed to write setting'
      );
    });
  });
});
