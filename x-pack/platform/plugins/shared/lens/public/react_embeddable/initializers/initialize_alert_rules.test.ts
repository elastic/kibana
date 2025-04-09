/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { createUnifiedSearchApi, getLensInternalApiMock } from '../mocks';
import { initializeAlertRules } from './initialize_alert_rules';
import type { RuleTypeRegistry } from '@kbn/alerting-plugin/server/types';
import type { ActionTypeRegistryContract } from '@kbn/alerts-ui-shared';

describe('Alert rules API', () => {
  const internalApiMock = getLensInternalApiMock();
  const parentApiMock = createUnifiedSearchApi();
  const { api } = initializeAlertRules(internalApiMock, parentApiMock);
  const ruleTypeRegistry: jest.Mocked<PublicMethodsOf<RuleTypeRegistry>> = {
    has: jest.fn(),
    register: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    getAllTypes: jest.fn(),
    ensureRuleTypeEnabled: jest.fn(),
  };
  const actionTypeRegistry: jest.Mocked<ActionTypeRegistryContract> = {
    has: jest.fn(),
    register: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  };

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
