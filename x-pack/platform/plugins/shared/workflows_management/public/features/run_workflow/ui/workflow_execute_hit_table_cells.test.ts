/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertMessageFromSource } from './workflow_execute_hit_table_cells';

describe('getAlertMessageFromSource', () => {
  it('prefers message over reason', () => {
    expect(
      getAlertMessageFromSource({
        message: 'Test message',
        'kibana.alert.reason': 'reason',
      })
    ).toBe('Test message');
  });

  it('falls back to alert reason', () => {
    expect(getAlertMessageFromSource({ 'kibana.alert.reason': 'reason text' })).toBe('reason text');
  });

  it('returns em dash when neither field is set', () => {
    expect(getAlertMessageFromSource({})).toBe('—');
  });
});
