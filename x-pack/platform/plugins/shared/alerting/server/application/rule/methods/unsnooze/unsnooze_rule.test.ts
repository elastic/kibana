/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client';
import { unsnoozeRule } from './unsnooze_rule';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';

const loggerErrorMock = jest.fn();
const getBulkMock = jest.fn();

const savedObjectsMock = savedObjectsRepositoryMock.create();
savedObjectsMock.get = jest.fn().mockReturnValue({
  attributes: {
    actions: [],
    snoozeSchedule: [
      {
        duration: 600000,
        rRule: {
          interval: 1,
          freq: 3,
          dtstart: '2025-03-01T06:30:37.011Z',
          tzid: 'UTC',
        },
        id: 'snooze_schedule_1',
      },
    ],
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

describe('validate unsnooze params', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should validate params correctly', async () => {
    await expect(
      unsnoozeRule(context, { id: '123', scheduleIds: ['snooze_schedule_1'] })
    ).resolves.toBeUndefined();
  });

  it('should validate params with empty schedule ids correctly', async () => {
    await expect(unsnoozeRule(context, { id: '123', scheduleIds: [] })).resolves.toBeUndefined();
  });

  it('should throw bad request for invalid params', async () => {
    // @ts-expect-error: testing invalid params
    await expect(unsnoozeRule(context, {})).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error validating unsnooze params - [id]: expected value of type [string] but got [undefined]"`
    );
  });
});
