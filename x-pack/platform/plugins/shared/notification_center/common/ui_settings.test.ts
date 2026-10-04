/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTIFICATION_REGISTRY } from './notification_registry';
import { NOTIFICATION_TYPE_REFS } from './notification_registry_utils';
import {
  NOTIFICATION_CENTER_ENABLED_SETTING,
  NOTIFICATION_CENTER_SETTING_DEFAULT,
  NOTIFICATION_CENTER_SETTING_KEYS,
  namespaceSettingKey,
  typeSettingKey,
} from './ui_settings';

describe('notification center ui settings keys', () => {
  it('nests a type key under its namespace key', () => {
    expect(namespaceSettingKey('inference')).toBe('notificationCenter:types:inference');
    expect(typeSettingKey('inference', 'modelStatus')).toBe(
      'notificationCenter:types:inference:modelStatus'
    );
    expect(
      typeSettingKey('inference', 'modelStatus').startsWith(`${namespaceSettingKey('inference')}:`)
    ).toBe(true);
  });

  it('covers the master switch plus every namespace and type in the registry', () => {
    const expected = [
      NOTIFICATION_CENTER_ENABLED_SETTING,
      ...Object.entries(NOTIFICATION_REGISTRY).flatMap(([namespace, { types }]) => [
        namespaceSettingKey(namespace),
        ...Object.keys(types).map((type) => typeSettingKey(namespace, type)),
      ]),
    ];

    expect(NOTIFICATION_CENTER_SETTING_KEYS).toEqual(expected);
    expect(new Set(NOTIFICATION_CENTER_SETTING_KEYS).size).toBe(
      NOTIFICATION_CENTER_SETTING_KEYS.length
    );
  });

  it('is off until launch', () => {
    expect(NOTIFICATION_CENTER_SETTING_DEFAULT).toBe(false);
  });
});

describe('NOTIFICATION_TYPE_REFS', () => {
  it('lists every registered (namespace, type) pair', () => {
    const expected = Object.entries(NOTIFICATION_REGISTRY).flatMap(([namespace, { types }]) =>
      Object.keys(types).map((type) => ({ namespace, type }))
    );

    expect(NOTIFICATION_TYPE_REFS).toEqual(expected);
  });
});
