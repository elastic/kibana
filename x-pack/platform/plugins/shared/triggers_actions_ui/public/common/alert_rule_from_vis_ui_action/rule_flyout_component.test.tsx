/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '@kbn/alerts-ui-shared';
import { render, screen } from '@testing-library/react';
import { createParentApiMock, makeEmbeddableServices } from '@kbn/lens-plugin/public/mocks';
import { ESQLVariableType } from '@kbn/esql-types';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import { getRuleFlyoutComponent } from './rule_flyout_component';
import { RuleFormData } from '@kbn/response-ops-rule-form';
import { EsQueryRuleParams } from '@kbn/response-ops-rule-params/es_query';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { TypeRegistry } from '../../application/type_registry';

const mockRuleFormFlyout = jest.fn((props) => <div data-test-subj={props['data-test-subj']} />);

jest.mock('@kbn/response-ops-rule-form/flyout', () => ({
  RuleFormFlyout: (...args: Parameters<typeof mockRuleFormFlyout>) => mockRuleFormFlyout(...args),
}));

function createRegistryMock<
  T extends PublicMethodsOf<TypeRegistry<{ id: string }>>
>(): jest.Mocked<T> {
  return {
    has: jest.fn(),
    register: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  } as jest.Mocked<T>;
}
const ruleTypeRegistry = createRegistryMock<RuleTypeRegistryContract>();
const actionTypeRegistry = createRegistryMock<ActionTypeRegistryContract>();

const startDependenciesMock = {
  ...makeEmbeddableServices(),
  fieldsMetadata: fieldsMetadataPluginPublicMock.createStartContract(),
};

const getLastCalledInitialValues = () => last(mockRuleFormFlyout.mock.calls)![0].initialValues;

async function renderFlyout(
  initialValues?: Partial<RuleFormData<Partial<EsQueryRuleParams>>>,
  parentApi: unknown = createParentApiMock()
) {
  const defaultParams = {
    searchType: 'esqlQuery',
    esqlQuery: {
      esql: 'FROM index | STATS `number of documents` = COUNT(*)',
    },
    ...initialValues?.params,
  } as EsQueryRuleParams;
  const Component = await getRuleFlyoutComponent(
    startDependenciesMock,
    ruleTypeRegistry,
    actionTypeRegistry,
    parentApi,
    {
      ...initialValues,
      params: defaultParams,
    } as RuleFormData<EsQueryRuleParams>
  );

  return render(<Component />);
}

describe('Alert rules API', () => {
  describe('createAlertRule', () => {
    it('should pass initial values to the rule form and open it', async () => {
      await renderFlyout();

      expect(await screen.findByTestId('lensEmbeddableRuleForm')).toBeInTheDocument();
      expect(getLastCalledInitialValues()).toMatchInlineSnapshot(`
        Object {
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
      await renderFlyout(
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
        createParentApiMock({
          esqlVariables$: new BehaviorSubject([
            { type: ESQLVariableType.FIELDS, key: 'field', value: 'field.zero' },
            { type: ESQLVariableType.FIELDS, key: 'field1', value: 'field.one' },
            { type: ESQLVariableType.TIME_LITERAL, key: 'interval', value: '5 minutes' },
          ]),
        })
      );
      expect(await screen.findByTestId('lensEmbeddableRuleForm')).toBeInTheDocument();
      expect(getLastCalledInitialValues()).toMatchInlineSnapshot(`
        Object {
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
