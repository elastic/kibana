/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient } from '../rules_client';
import { getBeforeSetup, setGlobalDate } from './lib';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { getRulesClientMockParams } from '../../test_utils';

const {
  rulesClientParams,
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  auditLogger,
} = getRulesClientMockParams();

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

describe('unsnoozeAlertInstance()', () => {
  test('removes only the targeted conditional snooze entry', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: ['still-muted'],
        snoozedInstances: [
          {
            instanceId: '2',
            snoozedAt: '2026-04-14T10:00:00.000Z',
            snoozedBy: 'elastic',
          },
          {
            instanceId: '3',
            snoozedAt: '2026-04-14T11:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
      },
      version: '123',
      references: [],
    });

    await rulesClient.unsnoozeAlertInstance({ alertId: '1', alertInstanceId: '2' });

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        snoozedInstances: [
          {
            instanceId: '3',
            snoozedAt: '2026-04-14T11:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
      },
      { version: '123' }
    );
  });
});
