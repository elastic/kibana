/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { NOTIFICATION_REGISTRY } from '../common/notification_registry';
import {
  NOTIFICATION_CENTER_ENABLED_SETTING,
  NOTIFICATION_TYPE_SETTINGS,
} from '../common/ui_settings';
import { registerNotificationCenterUiSettings } from './ui_settings';

const register = () => {
  const { uiSettings } = coreMock.createSetup();
  registerNotificationCenterUiSettings(uiSettings);
  return uiSettings.register.mock.calls[0][0];
};

describe('registerNotificationCenterUiSettings', () => {
  it('registers the master toggle plus one toggle per registered type', () => {
    const registered = register();
    const typeCount = Object.values(NOTIFICATION_REGISTRY).flatMap((namespace) =>
      Object.keys(namespace.types)
    ).length;

    // Setting keys contain dots, so `toHaveProperty` would read them as paths.
    expect(Object.keys(registered)).toEqual([
      NOTIFICATION_CENTER_ENABLED_SETTING,
      ...Object.values(NOTIFICATION_TYPE_SETTINGS),
    ]);
    expect(Object.keys(registered)).toHaveLength(typeCount + 1);
  });

  it('defaults every toggle to off and keeps them space-scoped booleans', () => {
    for (const setting of Object.values(register())) {
      expect(setting.value).toBe(false);
      expect(setting.type).toBe('boolean');
      expect(setting.category).toEqual(['notificationCenter']);
      // `scope` defaults to 'namespace', which is what keeps the opt-in per space.
      expect(setting.scope).toBeUndefined();
      expect(setting.schema.validate(true)).toBe(true);
      expect(() => setting.schema.validate('yes')).toThrow();
    }
  });

  it('puts the master toggle ahead of the per-type toggles', () => {
    const registered = register();

    expect(registered[NOTIFICATION_CENTER_ENABLED_SETTING].order).toBe(0);
    for (const settingKey of Object.values(NOTIFICATION_TYPE_SETTINGS)) {
      expect(registered[settingKey].order).toBeGreaterThan(0);
    }
  });

  it('names each type toggle from its registry entry', () => {
    const registered = register();

    expect(registered[NOTIFICATION_TYPE_SETTINGS['inference.modelStatus']].name).toBe(
      'Elastic Inference Service: Model status'
    );
  });
});
