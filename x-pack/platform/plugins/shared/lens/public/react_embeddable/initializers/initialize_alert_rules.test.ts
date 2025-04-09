/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '@kbn/alerts-ui-shared';
import { createUnifiedSearchApi, getLensInternalApiMock } from '../mocks';
import { initializeAlertRules } from './initialize_alert_rules';

const ruleTypeRegistry: jest.Mocked<RuleTypeRegistryContract> = {
  has: jest.fn(),
  register: jest.fn(),
  get: jest.fn(),
  list: jest.fn(),
};
const actionTypeRegistry: jest.Mocked<ActionTypeRegistryContract> = {
  has: jest.fn(),
  register: jest.fn(),
  get: jest.fn(),
  list: jest.fn(),
};
const internalApiMock = getLensInternalApiMock();
const parentApiMock = createUnifiedSearchApi();

describe('Alert rules API', () => {
  const { api } = initializeAlertRules(internalApiMock, parentApiMock);

  describe('createAlertRule', () => {
    it('should pass initial values to the rule form and open it', () => {
      api.createAlertRule(
        {
          params: {
            foo: 'bar',
          },
        },
        ruleTypeRegistry,
        actionTypeRegistry
      );
      expect(internalApiMock.alertRuleInitialValues$.getValue()).toMatchInlineSnapshot(`
        Object {
          "params": Object {
            "foo": "bar",
            "timeWindowSize": 7,
            "timeWindowUnit": "d",
          },
        }
      `);
      expect(internalApiMock.isRuleFormVisible$.getValue()).toBe(true);
    });

    it('should convert the timeRange to a time window', () => {
      parentApiMock.timeRange$.next({
        from: 'now-3w',
        to: 'now',
      });
      api.createAlertRule({}, ruleTypeRegistry, actionTypeRegistry);
      expect(internalApiMock.alertRuleInitialValues$.getValue()).toMatchInlineSnapshot(`
      Object {
        "params": Object {
          "timeWindowSize": 21,
          "timeWindowUnit": "d",
        },
      }
    `);

      parentApiMock.timeRange$.next({
        from: new Date('2025-01-01T00:00:00.000Z').toISOString(),
        to: new Date('2025-01-01T08:00:00.000Z').toISOString(),
      });
      api.createAlertRule({}, ruleTypeRegistry, actionTypeRegistry);
      expect(internalApiMock.alertRuleInitialValues$.getValue()).toMatchInlineSnapshot(`
      Object {
        "params": Object {
          "timeWindowSize": 8,
          "timeWindowUnit": "h",
        },
      }
    `);
    });
    it('should round timeRange to the nearest unit when converting to a time window', () => {
      parentApiMock.timeRange$.next({
        from: new Date('2025-01-01T00:00:00.000Z').toISOString(),
        to: new Date('2025-01-01T00:08:10.000Z').toISOString(),
      });
      api.createAlertRule({}, ruleTypeRegistry, actionTypeRegistry);
      expect(internalApiMock.alertRuleInitialValues$.getValue()).toMatchInlineSnapshot(`
      Object {
        "params": Object {
          "timeWindowSize": 8,
          "timeWindowUnit": "m",
        },
      }
    `);

      parentApiMock.timeRange$.next({
        from: new Date('2025-01-01T00:00:00.000Z').toISOString(),
        to: new Date('2025-01-01T00:00:08.900Z').toISOString(),
      });
      api.createAlertRule({}, ruleTypeRegistry, actionTypeRegistry);
      expect(internalApiMock.alertRuleInitialValues$.getValue()).toMatchInlineSnapshot(`
      Object {
        "params": Object {
          "timeWindowSize": 9,
          "timeWindowUnit": "s",
        },
      }
    `);
    });
  });
});
