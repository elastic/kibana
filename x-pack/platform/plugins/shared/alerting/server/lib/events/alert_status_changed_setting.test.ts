/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpServerMock,
  loggingSystemMock,
  savedObjectsServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID } from '../../../common/workflows';
import {
  isAlertStatusWorkflowTriggerEnabled,
  registerAlertStatusWorkflowTriggerSetting,
} from './alert_status_changed_setting';

describe('registerAlertStatusWorkflowTriggerSetting', () => {
  it('registers an experimental per-space boolean setting that is off by default', () => {
    const uiSettings = uiSettingsServiceMock.createSetupContract();

    registerAlertStatusWorkflowTriggerSetting(uiSettings);

    expect(uiSettings.register).toHaveBeenCalledTimes(1);
    expect(uiSettings.registerGlobal).not.toHaveBeenCalled();
    const [registered] = uiSettings.register.mock.calls[0];
    expect(registered[ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID]).toEqual(
      expect.objectContaining({
        type: 'boolean',
        value: false,
        experimental: true,
        category: ['alerting'],
      })
    );
  });

  it('uses the documented setting id', () => {
    expect(ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID).toBe(
      'alerting:v1:alertStatusWorkflowTrigger:enabled'
    );
  });
});

describe('isAlertStatusWorkflowTriggerEnabled', () => {
  const setup = () => {
    const logger = loggingSystemMock.createLogger();
    const request = httpServerMock.createKibanaRequest();
    const savedObjects = savedObjectsServiceMock.createStartContract();
    const uiSettings = uiSettingsServiceMock.createStartContract();
    const client = uiSettingsServiceMock.createClient();
    uiSettings.asScopedToClient.mockReturnValue(client);
    return { logger, request, savedObjects, uiSettings, client };
  };

  it('returns true when the setting is on', async () => {
    const { logger, request, savedObjects, uiSettings, client } = setup();
    client.get.mockResolvedValue(true);

    await expect(
      isAlertStatusWorkflowTriggerEnabled({ uiSettings, savedObjects, request, logger })
    ).resolves.toBe(true);
    expect(client.get).toHaveBeenCalledWith(ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID);
  });

  it('returns false when the setting is off', async () => {
    const { logger, request, savedObjects, uiSettings, client } = setup();
    client.get.mockResolvedValue(false);

    await expect(
      isAlertStatusWorkflowTriggerEnabled({ uiSettings, savedObjects, request, logger })
    ).resolves.toBe(false);
  });

  it('returns false for anything that is not exactly true', async () => {
    const { logger, request, savedObjects, uiSettings, client } = setup();
    client.get.mockResolvedValue('true');

    await expect(
      isAlertStatusWorkflowTriggerEnabled({ uiSettings, savedObjects, request, logger })
    ).resolves.toBe(false);
  });

  it('builds the saved objects client from the request and skips the security extension', async () => {
    const { logger, request, savedObjects, uiSettings, client } = setup();
    client.get.mockResolvedValue(true);

    await isAlertStatusWorkflowTriggerEnabled({ uiSettings, savedObjects, request, logger });

    expect(savedObjects.getScopedClient).toHaveBeenCalledWith(request, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });
  });

  it('returns false and logs a warning when the read throws', async () => {
    const { logger, request, savedObjects, uiSettings, client } = setup();
    client.get.mockRejectedValue(new Error('saved objects unavailable'));

    await expect(
      isAlertStatusWorkflowTriggerEnabled({ uiSettings, savedObjects, request, logger })
    ).resolves.toBe(false);
    expect(loggingSystemMock.collect(logger).warn).toEqual([
      [expect.stringContaining('saved objects unavailable')],
    ]);
  });
});
