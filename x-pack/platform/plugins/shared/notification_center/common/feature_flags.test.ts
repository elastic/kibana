/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTIFICATION_REGISTRY } from './notification_registry';
import { NOTIFICATION_TYPE_ENABLED_DEFAULT, NOTIFICATION_TYPE_FLAGS } from './feature_flags';

describe('notification type flags', () => {
  it('derives one entry per flagged type, keyed by <namespace>.<typeId>', () => {
    const flaggedTypeCount = Object.values(NOTIFICATION_REGISTRY)
      .flatMap((namespace) => Object.values(namespace.types))
      .filter((type) => type.feature_flag !== undefined).length;

    const entries = Object.entries(NOTIFICATION_TYPE_FLAGS);
    expect(entries).toHaveLength(flaggedTypeCount);
    for (const [key, flag] of entries) {
      expect(flag).toBe(`notificationCenter.types.${key}`);
    }
  });

  it('keeps notification types off by default', () => {
    expect(NOTIFICATION_TYPE_ENABLED_DEFAULT).toBe(false);
  });
});
