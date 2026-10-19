/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient } from '../../../../rules_client/rules_client';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { getBeforeSetup } from '../../../../rules_client/tests/lib';
import { getRulesClientMockParams } from '../../../../test_utils';

describe('resolve', () => {
  const kibanaVersion = 'v8.2.0';
  const createAPIKeyMock = jest.fn();
  const isAuthenticationTypeApiKeyMock = jest.fn();
  const getAuthenticationApiKeyMock = jest.fn();

  const { rulesClientParams, taskManager, ruleTypeRegistry, unsecuredSavedObjectsClient } =
    getRulesClientMockParams({
      kibanaVersion,
      createAPIKey: createAPIKeyMock,
      isAuthenticationTypeAPIKey: isAuthenticationTypeApiKeyMock,
      getAuthenticationAPIKey: getAuthenticationApiKeyMock,
    });

  let rulesClient: RulesClient;

  beforeEach(() => {
    jest.clearAllMocks();
    getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
    rulesClient = new RulesClient(rulesClientParams);
  });

  describe('actions', () => {
    it('transform actions correctly', async () => {
      unsecuredSavedObjectsClient.resolve.mockResolvedValue({
        outcome: 'exactMatch',
        saved_object: {
          id: 'test-rule',
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: {
            alertTypeId: '123',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            actions: [
              {
                frequency: {
                  notifyWhen: 'onActiveAlert' as const,
                  summary: false,
                  throttle: null,
                },
                group: 'default',
                params: {},
                actionRef: 'action_0',
                actionTypeId: 'test-1',
                uuid: '222',
              },
              {
                params: {},
                actionRef: 'system_action:system_action-id',
                actionTypeId: 'test-2',
                uuid: '222',
              },
            ],
            notifyWhen: 'onActiveAlert',
            executionStatus: {},
          },
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
      });

      const res = await rulesClient.resolve({ id: 'test-rule' });

      expect(res.actions).toEqual([
        {
          actionTypeId: 'test-1',
          frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
          group: 'default',
          id: '1',
          params: {},
          uuid: '222',
        },
      ]);

      expect(res.systemActions).toEqual([
        { actionTypeId: 'test-2', id: 'system_action-id', params: {}, uuid: '222' },
      ]);
    });
  });
});
