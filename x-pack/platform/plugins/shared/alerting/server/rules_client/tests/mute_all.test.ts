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
  authorization,
  auditLogger,
} = getRulesClientMockParams();

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

describe('muteAll()', () => {
  test('mutes an alert', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: {
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: '1',
            actionRef: '1',
            params: {
              foo: true,
            },
          },
        ],
        muteAll: false,
      },
      references: [],
      version: '123',
    });

    await rulesClient.muteAll({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        muteAll: true,
        mutedInstanceIds: [],
        snoozeSchedule: [],
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
      },
      {
        version: '123',
      }
    );
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          actions: [
            {
              group: 'default',
              id: '1',
              actionTypeId: '1',
              actionRef: '1',
              params: {
                foo: true,
              },
            },
          ],
          consumer: 'myApp',
          schedule: { interval: '10s' },
          alertTypeId: 'myType',
          apiKey: null,
          apiKeyOwner: null,
          enabled: false,
          scheduledTaskId: null,
          updatedBy: 'elastic',
          muteAll: false,
        },
        references: [],
      });
    });

    test('ensures user is authorised to muteAll this type of alert under the consumer', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      await rulesClient.muteAll({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'muteAll',
        ruleTypeId: 'myType',
      });
    });

    test('throws when user is not authorised to muteAll this type of alert', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to muteAll a "myType" alert for "myApp"`)
      );

      await expect(rulesClient.muteAll({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to muteAll a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'muteAll',
        ruleTypeId: 'myType',
      });
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when muting a rule', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'fake_rule_name',
          actions: [
            {
              group: 'default',
              id: '1',
              actionTypeId: '1',
              actionRef: '1',
              params: {
                foo: true,
              },
            },
          ],
          muteAll: false,
        },
        references: [],
        version: '123',
      });
      await rulesClient.muteAll({ id: '1' });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_mute',
            outcome: 'unknown',
          }),
          kibana: {
            saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'fake_rule_name' },
          },
        })
      );
    });

    test('logs audit event when not authorised to mute a rule', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'fake_rule_name',
          actions: [
            {
              group: 'default',
              id: '1',
              actionTypeId: '1',
              actionRef: '1',
              params: {
                foo: true,
              },
            },
          ],
          muteAll: false,
        },
        references: [],
        version: '123',
      });
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(rulesClient.muteAll({ id: '1' })).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_mute',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: '1',
              type: RULE_SAVED_OBJECT_TYPE,
              name: 'fake_rule_name',
            },
          },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });
  });
});
