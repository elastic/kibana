/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isValidAlertIndexName } from './is_valid_alert_index_name';

describe('isValidAlertIndexName', () => {
  test('returns true if valid', () => {
    expect(isValidAlertIndexName('.internal.alerts-stack.alerts-default-000001')).toBe(true);
    expect(isValidAlertIndexName('.alerts-stack.alerts-default-000001')).toBe(true);
    expect(isValidAlertIndexName('.ds-.alerts-stack.alerts-default-000001')).toBe(true);
  });

  test('returns false if invalid', () => {
    expect(isValidAlertIndexName('partial-.internal.alerts-stack.alerts-default-000001')).toBe(
      false
    );
    expect(isValidAlertIndexName('restored-.alerts-stack.alerts-default-000001')).toBe(false);
    expect(isValidAlertIndexName('any-old-index-name')).toBe(false);
  });
});
