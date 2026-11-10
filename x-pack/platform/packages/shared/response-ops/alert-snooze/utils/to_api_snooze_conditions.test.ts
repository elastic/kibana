/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toApiSnoozeConditions } from './to_api_snooze_conditions';
import { DataConditionType } from '../components/types';

describe('toApiSnoozeConditions', () => {
  it('returns an empty list when there are no conditions', () => {
    expect(toApiSnoozeConditions()).toEqual([]);
    expect(toApiSnoozeConditions([])).toEqual([]);
  });

  it('keeps the built-in condition types', () => {
    const conditions = [
      { type: DataConditionType.SEVERITY_CHANGE },
      { type: DataConditionType.SEVERITY_EQUALS, value: 'critical' as const },
      { type: DataConditionType.FIELD_CHANGE, field: 'host.name' },
    ];

    expect(toApiSnoozeConditions(conditions)).toEqual(conditions);
  });

  it('drops condition types the snooze API does not accept', () => {
    const conditions = [
      { type: DataConditionType.SEVERITY_CHANGE },
      { type: 'custom_condition', payload: 'anything' },
    ];

    expect(toApiSnoozeConditions(conditions)).toEqual([
      { type: DataConditionType.SEVERITY_CHANGE },
    ]);
  });
});
