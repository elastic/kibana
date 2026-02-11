/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformUnmuteRequestToRuleAttributes } from './transform_rule_unmute_instance_ids';
import type { SavedObjectsBulkResponse } from '@kbn/core-saved-objects-api-server';
import type { RawRule } from '../../../../../saved_objects/schemas/raw_rule';

describe('transformUnmuteRequestToRuleAttributes', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-11-01T08:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should transform unmute request to rule attributes by removing instance IDs and setting updatedAt', () => {
    const paramRules = [
      { id: 'rule-1', alertInstanceIds: ['instance-1'] },
      { id: 'rule-2', alertInstanceIds: ['instance-2', 'instance-3', 'instance-5'] },
    ];
    const savedRules = [
      { id: 'rule-1', attributes: { mutedInstanceIds: ['instance-0', 'instance-1'] } },
      {
        id: 'rule-2',
        attributes: { mutedInstanceIds: ['instance-2', 'instance-3', 'instance-4'] },
      },
    ] as SavedObjectsBulkResponse<RawRule>['saved_objects'];

    const result = transformUnmuteRequestToRuleAttributes({ paramRules, savedRules });

    expect(result).toEqual([
      {
        id: 'rule-1',
        attributes: {
          mutedInstanceIds: ['instance-0'],
          updatedAt: '2025-11-01T08:00:00.000Z',
        },
      },
      {
        id: 'rule-2',
        attributes: { mutedInstanceIds: ['instance-4'], updatedAt: '2025-11-01T08:00:00.000Z' },
      },
    ]);
  });

  it('should return an empty array if no new instance IDs are to be added or rules are not found', () => {
    const paramRules = [
      { id: 'rule-1', alertInstanceIds: ['instance-1'] },
      { id: 'rule-2', alertInstanceIds: ['instance-3'] },
      { id: 'rule-4', alertInstanceIds: ['instance-5'] }, // Rule not in savedRules
    ];
    const savedRules = [
      { id: 'rule-1', attributes: { mutedInstanceIds: ['instance-2'] } }, // instance-1 is not muted
      { id: 'rule-2', attributes: { mutedInstanceIds: ['instance-4', 'instance-5'] } }, // instance-3 is not muted
    ] as SavedObjectsBulkResponse<RawRule>['saved_objects'];

    const result = transformUnmuteRequestToRuleAttributes({ paramRules, savedRules });

    expect(result).toEqual([]);
  });
});
