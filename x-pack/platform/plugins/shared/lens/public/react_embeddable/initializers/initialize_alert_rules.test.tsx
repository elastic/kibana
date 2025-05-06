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
import { createEsqlVariablesApi, makeEmbeddableServices } from '../mocks';
import { initializeAlertRules } from './initialize_alert_rules';
import { ESQLVariableType } from '@kbn/esql-types';

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
const parentApiMock = {
  ...createEsqlVariablesApi(),
};

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
            searchType: 'esqlQuery',
            esqlQuery: {
              esql: 'FROM index | STATS `number of documents` = COUNT(*)',
            },
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
            "esqlQuery": Object {
              "esql": "FROM index | STATS \`number of documents\` = COUNT(*)",
            },
            "searchType": "esqlQuery",
          },
        }
      `);
    });

    it('should parse esql variables in the query', async () => {
      parentApiMock.esqlVariables$.next([
        { type: ESQLVariableType.FIELDS, key: 'field', value: 'field.zero' },
        { type: ESQLVariableType.FIELDS, key: 'field1', value: 'field.one' },
        { type: ESQLVariableType.TIME_LITERAL, key: 'interval', value: '5 minutes' },
      ]);
      api.createAlertRule(
        {
          params: {
            searchType: 'esqlQuery',
            esqlQuery: {
              // Put ??field1 before ??field intentionally; /field/ is a part of /field1/ so we want to ensure
              // regexp logic doesn't accidentally replace /??field/1 instead of /??field1/
              esql: 'FROM index | STATS aggregatedFields = ??field1, ??field BY BUCKET(@timestamp, ?interval)',
            },
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
            "esqlQuery": Object {
              "esql": "FROM index | STATS aggregatedFields = field.one, field.zero BY BUCKET(@timestamp, 5 minutes)",
            },
            "searchType": "esqlQuery",
          },
        }
      `);
    });
  });
});
