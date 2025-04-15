/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import React from 'react';
import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '@kbn/alerts-ui-shared';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BehaviorSubject } from 'rxjs';
import { createUnifiedSearchApi, makeEmbeddableServices } from '../mocks';
import { initializeAlertRules } from './initialize_alert_rules';

const mockRender = render;
const mockRuleFormFlyout = jest.fn((props) => <div data-test-subj={props['data-test-subj']} />);
jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: jest.fn((node: ReactNode) => mockRender(node)),
}));

jest.mock('@kbn/response-ops-rule-form/flyout', () => ({
  RuleFormFlyout: (...args: Parameters<typeof mockRuleFormFlyout>) => mockRuleFormFlyout(...args),
}));
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
const parentApiMock = createUnifiedSearchApi();

const startDependenciesMock = makeEmbeddableServices(new BehaviorSubject<string>(''), undefined, {
  visOverrides: { id: 'lnsXY' },
  dataOverrides: { id: 'formBased' },
});

const uuid = '000-000-000';

const getLastCalledInitialValues = () => last(mockRuleFormFlyout.mock.calls)![0].initialValues;

describe('Alert rules API', () => {
  const { api } = initializeAlertRules(uuid, parentApiMock, startDependenciesMock);

  describe('createAlertRule', () => {
    it('should pass initial values to the rule form and open it', async () => {
      api.createAlertRule(
        {
          params: {
            foo: 'bar',
          },
        },
        ruleTypeRegistry,
        actionTypeRegistry
      );
      expect(await screen.findByTestId('lensEmbeddableRuleForm')).toBeInTheDocument();
      expect(getLastCalledInitialValues()).toMatchInlineSnapshot(`
        Object {
          "name": "Elasticsearch query rule from visualization",
          "params": Object {
            "foo": "bar",
            "timeWindowSize": 7,
            "timeWindowUnit": "d",
          },
        }
      `);
    });

    it('should convert the timeRange to a time window', () => {
      parentApiMock.timeRange$.next({
        from: 'now-3w',
        to: 'now',
      });
      api.createAlertRule({}, ruleTypeRegistry, actionTypeRegistry);
      expect(getLastCalledInitialValues().params).toMatchInlineSnapshot(`
        Object {
          "timeWindowSize": 21,
          "timeWindowUnit": "d",
        }
      `);

      parentApiMock.timeRange$.next({
        from: new Date('2025-01-01T00:00:00.000Z').toISOString(),
        to: new Date('2025-01-01T08:00:00.000Z').toISOString(),
      });
      api.createAlertRule({}, ruleTypeRegistry, actionTypeRegistry);
      expect(getLastCalledInitialValues().params).toMatchInlineSnapshot(`
        Object {
          "timeWindowSize": 8,
          "timeWindowUnit": "h",
        }
      `);
    });
    it('should round timeRange to the nearest unit when converting to a time window', () => {
      parentApiMock.timeRange$.next({
        from: new Date('2025-01-01T00:00:00.000Z').toISOString(),
        to: new Date('2025-01-01T00:08:10.000Z').toISOString(),
      });
      api.createAlertRule({}, ruleTypeRegistry, actionTypeRegistry);
      expect(getLastCalledInitialValues().params).toMatchInlineSnapshot(`
        Object {
          "timeWindowSize": 8,
          "timeWindowUnit": "m",
        }
      `);

      parentApiMock.timeRange$.next({
        from: new Date('2025-01-01T00:00:00.000Z').toISOString(),
        to: new Date('2025-01-01T00:00:08.900Z').toISOString(),
      });
      api.createAlertRule({}, ruleTypeRegistry, actionTypeRegistry);
      expect(getLastCalledInitialValues().params).toMatchInlineSnapshot(`
        Object {
          "timeWindowSize": 9,
          "timeWindowUnit": "s",
        }
      `);
    });
  });
});
