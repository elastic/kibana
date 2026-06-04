/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { NOTIFICATIONS_CENTER_UI_ENABLED_FLAG } from '../common';
import { NotificationsCenterPlugin } from './plugin';
import { configSchema } from './config';

describe('NotificationsCenterPlugin', () => {
  const createPlugin = () => {
    const config = configSchema.validate({});
    const initializerContext = coreMock.createPluginInitializerContext(config);
    return new NotificationsCenterPlugin(initializerContext);
  };

  it('sets up without registering anything user-visible', () => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();

    expect(() => plugin.setup(coreSetup)).not.toThrow();
    expect(coreSetup.http.createRouter).not.toHaveBeenCalled();
  });

  it('evaluates the off-by-default UI feature flag on start', () => {
    const plugin = createPlugin();
    const coreStart = coreMock.createStart();
    (coreStart.featureFlags.getBooleanValue as jest.Mock).mockResolvedValue(false);

    plugin.start(coreStart);

    expect(coreStart.featureFlags.getBooleanValue).toHaveBeenCalledWith(
      NOTIFICATIONS_CENTER_UI_ENABLED_FLAG,
      false
    );
  });
});
