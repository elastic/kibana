/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockedDateString } from '../tests/lib';
import { incrementRevision } from './increment_revision';
import { SavedObject } from '@kbn/core/server';
import { RawRule, RuleTypeParams } from '../../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { UpdateRuleData } from '../../application/rule/methods/update';

describe('incrementRevision', () => {
  const currentRule: SavedObject<RawRule> = {
    id: '1',
    type: RULE_SAVED_OBJECT_TYPE,
    attributes: {
      enabled: true,
      name: 'rule-name',
      tags: ['tag-1', 'tag-2'],
      alertTypeId: '123',
      consumer: 'rule-consumer',
      legacyId: null,
      schedule: { interval: '1s' },
      actions: [],
      params: {},
      createdBy: null,
      updatedBy: null,
      createdAt: mockedDateString,
      updatedAt: mockedDateString,
      apiKey: null,
      apiKeyOwner: null,
      throttle: null,
      notifyWhen: null,
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'unknown',
        lastExecutionDate: '2020-08-20T19:23:38Z',
        error: null,
        warning: null,
      },
      revision: 0,
    },
    references: [],
  };

  const updatedParams: RuleTypeParams = { bar: true, risk_score: 40, severity: 'low' };

  const updateRuleData: UpdateRuleData<RuleTypeParams> = {
    schedule: {
      interval: '1m',
    },
    name: 'abc',
    tags: ['foo'],
    params: {
      bar: true,
      risk_score: 40,
      severity: 'low',
    },
    throttle: null,
    notifyWhen: 'onActiveAlert',
    actions: [],
  };

  it('should return the current revision if no attrs or params are updated', () => {
    expect(
      incrementRevision({
        originalRule: currentRule.attributes,
        updateRuleData: {} as UpdateRuleData,
        updatedParams: {},
      })
    ).toBe(0);
  });

  it('should increment the revision if a root level attr is updated', () => {
    expect(
      incrementRevision({
        originalRule: currentRule.attributes,
        updateRuleData,
        updatedParams: {},
      })
    ).toBe(1);
  });

  it('should increment the revision if a rule param is updated', () => {
    expect(
      incrementRevision({
        originalRule: currentRule.attributes,
        updateRuleData: {} as UpdateRuleData,
        updatedParams,
      })
    ).toBe(1);
  });

  it('should not increment the revision if an excluded attr is updated', () => {
    expect(
      incrementRevision({
        originalRule: currentRule.attributes,
        updateRuleData: { activeSnoozes: ['excludedValue'] } as unknown as UpdateRuleData,
        updatedParams: {},
      })
    ).toBe(0);
  });

  it('should not increment the revision if an excluded param is updated', () => {
    expect(
      incrementRevision({
        originalRule: currentRule.attributes,
        updateRuleData: {} as UpdateRuleData,
        updatedParams: { isSnoozedUntil: '1970-01-02T00:00:00.000Z' },
      })
    ).toBe(0);
  });
});
