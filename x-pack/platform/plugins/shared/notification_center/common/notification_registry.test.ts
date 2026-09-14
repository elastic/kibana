/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTIFICATION_REGISTRY } from './notification_registry';
import {
  NOTIFICATION_NAMESPACES,
  isRegisteredNotificationRef,
} from './notification_registry_utils';

describe('notification registry', () => {
  it('derives the namespace tuple from the registry keys', () => {
    expect([...NOTIFICATION_NAMESPACES].sort()).toEqual(Object.keys(NOTIFICATION_REGISTRY).sort());
  });

  it('keys every declared feature flag by the qualified notificationCenter.types.<namespace>.<typeId>', () => {
    for (const [namespaceId, namespace] of Object.entries(NOTIFICATION_REGISTRY)) {
      for (const [typeId, type] of Object.entries(namespace.types)) {
        if (type.feature_flag !== undefined) {
          expect(type.feature_flag).toBe(`notificationCenter.types.${namespaceId}.${typeId}`);
        }
      }
    }
  });

  describe('isRegisteredNotificationRef', () => {
    it('accepts a type registered under its namespace', () => {
      expect(isRegisteredNotificationRef('inference', 'modelStatus')).toBe(true);
    });

    it('rejects an unknown namespace', () => {
      expect(isRegisteredNotificationRef('nope', 'modelStatus')).toBe(false);
    });

    it('rejects a type not registered under an existing namespace', () => {
      expect(isRegisteredNotificationRef('inference', 'notARegisteredType')).toBe(false);
    });

    it('does not resolve inherited object keys as registered types', () => {
      expect(isRegisteredNotificationRef('inference', 'toString')).toBe(false);
    });

    it('returns false for prototype-key namespaces instead of throwing', () => {
      expect(isRegisteredNotificationRef('__proto__', 'modelStatus')).toBe(false);
      expect(isRegisteredNotificationRef('constructor', 'modelStatus')).toBe(false);
    });
  });
});
