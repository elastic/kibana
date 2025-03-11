/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client';
import { snoozeRule } from './snooze_rule';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SnoozeRuleOptions } from './types';

const loggerErrorMock = jest.fn();
const getBulkMock = jest.fn();

const savedObjectsMock = savedObjectsRepositoryMock.create();
savedObjectsMock.get = jest.fn().mockReturnValue({
  attributes: {
    actions: [],
  },
  version: '9.0.0',
});

const context = {
  logger: { error: loggerErrorMock },
  getActionsClient: () => {
    return {
      getBulk: getBulkMock,
    };
  },
  unsecuredSavedObjectsClient: savedObjectsMock,
  authorization: { ensureAuthorized: async () => {} },
  ruleTypeRegistry: {
    ensureRuleTypeEnabled: () => {},
  },
  getUserName: async () => {},
} as unknown as RulesClientContext;

describe('validate snooze params and body', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw bad request for invalid params', async () => {
    const invalidParams = {
      id: 22,
      snoozeSchedule: getSnoozeSchedule(),
    };

    // @ts-expect-error: testing invalid params
    await expect(snoozeRule(context, invalidParams)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error validating snooze - [id]: expected value of type [string] but got [number]"`
    );
  });

  it('should throw bad request for invalid snooze schedule', async () => {
    const invalidParams = {
      id: '123',
      // @ts-expect-error: testing invalid params
      snoozeSchedule: getSnoozeSchedule({ rRule: { dtstart: 'invalid' } }),
    };

    await expect(snoozeRule(context, invalidParams)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error validating snooze - [rRule.dtstart]: Invalid date: invalid"`
    );
  });
});

const getSnoozeSchedule = (
  override?: SnoozeRuleOptions['snoozeSchedule']
): SnoozeRuleOptions['snoozeSchedule'] => {
  return {
    id: '123',
    duration: 28800000,
    rRule: {
      dtstart: '2010-09-19T11:49:59.329Z',
      count: 1,
      tzid: 'UTC',
    },
    ...override,
  };
};
