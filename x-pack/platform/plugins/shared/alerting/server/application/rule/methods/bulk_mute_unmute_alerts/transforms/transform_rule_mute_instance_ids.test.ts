/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformMuteRequestToRuleAttributes } from './transform_rule_mute_instance_ids';
import type { SavedObjectsBulkResponse } from '@kbn/core-saved-objects-api-server';
import type { RawRule } from '../../../../../saved_objects/schemas/raw_rule';

describe('transformMuteRequestToRuleAttributes', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-11-01T08:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should transform mute request to rule attributes by merging instance IDs and setting updatedAt', () => {
    const paramRules = [
      { id: 'rule-1', alertInstanceIds: ['instance-1', 'instance-2'] },
      { id: 'rule-2', alertInstanceIds: ['instance-3'] },
    ];
    const savedRules = [
      { id: 'rule-1', attributes: { mutedInstanceIds: ['instance-0', 'instance-1'] } },
      { id: 'rule-2', attributes: { mutedInstanceIds: [] } },
    ] as SavedObjectsBulkResponse<RawRule>['saved_objects'];

    const result = transformMuteRequestToRuleAttributes({ paramRules, savedRules });

    expect(result).toEqual([
      {
        id: 'rule-1',
        attributes: {
          mutedInstanceIds: ['instance-0', 'instance-1', 'instance-2'],
          updatedAt: '2025-11-01T08:00:00.000Z',
        },
      },
      {
        id: 'rule-2',
        attributes: { mutedInstanceIds: ['instance-3'], updatedAt: '2025-11-01T08:00:00.000Z' },
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
      { id: 'rule-1', attributes: { mutedInstanceIds: ['instance-1'] } }, // All instanceIds already muted
      { id: 'rule-2', attributes: { mutedInstanceIds: ['instance-3', 'instance-4'] } }, // instance-3 is already muted
    ] as SavedObjectsBulkResponse<RawRule>['saved_objects'];

    const result = transformMuteRequestToRuleAttributes({ paramRules, savedRules });

    expect(result).toEqual([]);
  });
});
