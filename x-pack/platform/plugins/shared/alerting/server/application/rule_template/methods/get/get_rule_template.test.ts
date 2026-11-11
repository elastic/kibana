/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { RulesClient } from '../../../../rules_client/rules_client';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { getRulesClientMockParams } from '../../../../test_utils';

jest.mock('../../../../rules_client/lib/siem_legacy_actions/format_legacy_actions', () => {
  return {
    formatLegacyActions: jest.fn(),
  };
});

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

describe('getTemplate()', () => {
  it('calls saved objects client with given params', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      attributes: {
        ruleTypeId: '123',
        name: 'test template',
        description: 'test template',
        tags: ['foo'],
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
      },
      references: [],
    });

    const result = await rulesClient.getTemplate({ id: '1' });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "alertDelay": undefined,
        "artifacts": undefined,
        "description": "test template",
        "engine": undefined,
        "flapping": undefined,
        "id": "1",
        "name": "test template",
        "params": Object {
          "bar": true,
        },
        "ruleTypeId": "123",
        "schedule": Object {
          "interval": "10s",
        },
        "tags": Array [
          "foo",
        ],
      }
    `);
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerting_rule_template",
        "1",
        undefined,
      ]
    `);
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        attributes: {
          ruleTypeId: 'myType',
          name: 'test template',
          tags: ['foo'],
          schedule: { interval: '10s' },
          params: {
            bar: true,
          },
        },
        references: [],
      });
    });

    it('ensures user is authorised to get this type of rule template', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      await rulesClient.getTemplate({ id: '1' });

      expect(authorization.ensureAuthorizedByRuleType).toHaveBeenCalledWith({
        ruleTypeId: 'myType',
        operation: 'get',
        entity: 'rule',
        consumerRequiredPrivilege: 'read',
      });
    });

    it('throws when user is not authorised to get this type of rule template', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      authorization.ensureAuthorizedByRuleType.mockRejectedValueOnce(
        Boom.forbidden('Unauthorized to get "myType" rule')
      );

      await expect(rulesClient.getTemplate({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get "myType" rule]`
      );

      expect(authorization.ensureAuthorizedByRuleType).toHaveBeenCalledWith({
        ruleTypeId: 'myType',
        operation: 'get',
        entity: 'rule',
        consumerRequiredPrivilege: 'read',
      });
    });
  });

  describe('audit logging', () => {
    it('logs audit event on successful get', async () => {
      const rulesClient = new RulesClient({
        ...rulesClientParams,
        auditLogger,
      });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        attributes: {
          ruleTypeId: 'myType',
          name: 'test template',
          tags: ['foo'],
          schedule: { interval: '10s' },
          params: {},
        },
        references: [],
      });

      await rulesClient.getTemplate({ id: '1' });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_template_get',
            outcome: 'success',
          }),
          kibana: {
            saved_object: {
              type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
              id: '1',
              name: 'test template',
            },
          },
        })
      );
    });

    it('logs audit event on authorization failure', async () => {
      const rulesClient = new RulesClient({
        ...rulesClientParams,
        auditLogger,
      });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        attributes: {
          ruleTypeId: 'myType',
          name: 'test template',
          tags: ['foo'],
          schedule: { interval: '10s' },
          params: {},
        },
        references: [],
      });
      authorization.ensureAuthorizedByRuleType.mockRejectedValueOnce(
        Boom.forbidden('Unauthorized to get "myType" rule')
      );

      await expect(rulesClient.getTemplate({ id: '1' })).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_template_get',
            outcome: 'failure',
          }),
          error: expect.objectContaining({
            message: 'Unauthorized to get "myType" rule',
          }),
          kibana: {
            saved_object: {
              type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
              id: '1',
              name: 'test template',
            },
          },
        })
      );
    });
  });
});
