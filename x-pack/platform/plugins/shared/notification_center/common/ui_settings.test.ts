/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTIFICATION_REGISTRY } from './notification_registry';
import {
  NOTIFICATION_CENTER_ENABLED_DEFAULT,
  NOTIFICATION_TYPE_SETTING_DEFAULT,
  NOTIFICATION_TYPE_SETTINGS,
} from './ui_settings';

describe('notification type settings', () => {
  it('derives one entry per registered type, keyed by <namespace>.<typeId>', () => {
    const typeCount = Object.values(NOTIFICATION_REGISTRY).flatMap((namespace) =>
      Object.keys(namespace.types)
    ).length;

    const entries = Object.entries(NOTIFICATION_TYPE_SETTINGS);
    expect(entries).toHaveLength(typeCount);
    for (const [typeId, settingKey] of entries) {
      expect(settingKey).toBe(`notificationCenter:types:${typeId}`);
    }
  });

  it('keeps the Notification Center and its types opted out by default', () => {
    expect(NOTIFICATION_CENTER_ENABLED_DEFAULT).toBe(false);
    expect(NOTIFICATION_TYPE_SETTING_DEFAULT).toBe(false);
  });
});
