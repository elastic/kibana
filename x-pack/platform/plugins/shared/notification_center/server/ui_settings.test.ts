/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NOTIFICATION_CENTER_SETTINGS_CATEGORY,
  NOTIFICATION_CENTER_SETTING_KEYS,
  namespaceSettingKey,
  typeSettingKey,
} from '../common/ui_settings';
import { getNotificationCenterUiSettings } from './ui_settings';

describe('getNotificationCenterUiSettings', () => {
  const settings = getNotificationCenterUiSettings();

  // Keys contain colons, which `toHaveProperty` is fine with, but assert on the key list anyway
  // so a renamed key fails here rather than silently dropping a row from the settings app.
  it('registers exactly the keys the browser gate reads', () => {
    expect(Object.keys(settings)).toEqual([...NOTIFICATION_CENTER_SETTING_KEYS]);
  });

  it('ships every row as an off-by-default, space-scoped tech preview boolean', () => {
    Object.values(settings).forEach((setting) => {
      expect(setting).toMatchObject({
        category: [NOTIFICATION_CENTER_SETTINGS_CATEGORY],
        type: 'boolean',
        value: false,
        technicalPreview: true,
        requiresPageReload: false,
        solutionViews: ['classic', 'es'],
      });
      // Omitting `scope` is what keeps these per-space; `global` would defeat the whole feature.
      expect(setting.scope).toBeUndefined();
      expect(setting.readonly).toBeUndefined();
      expect(setting.schema.validate(true)).toBe(true);
      expect(() => setting.schema.validate('yes')).toThrow();
    });
  });

  it('names rows from the registry and sorts types under their namespace', () => {
    expect(settings[namespaceSettingKey('inference')]).toMatchObject({
      name: 'Elastic Inference Service notifications',
      description: 'Lifecycle changes to inference models.',
    });
    expect(settings[typeSettingKey('inference', 'modelStatus')]).toMatchObject({
      name: 'Elastic Inference Service: Model status',
    });

    const orders = NOTIFICATION_CENTER_SETTING_KEYS.map((key) => Number(settings[key].order));

    expect(orders[0]).toBe(0);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(new Set(orders).size).toBe(orders.length);
  });
});
