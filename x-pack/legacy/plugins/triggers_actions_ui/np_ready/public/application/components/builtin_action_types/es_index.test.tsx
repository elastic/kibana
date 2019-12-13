/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ActionTypeRegistry } from '../../action_type_registry';
import { registerBuiltInActionTypes } from './index';
import { ActionTypeModel, ActionConnector } from '../../../types';

const ACTION_TYPE_ID = '.index';
let actionTypeModel: ActionTypeModel;

beforeAll(() => {
  const actionTypeRegistry = new ActionTypeRegistry();
  registerBuiltInActionTypes({ actionTypeRegistry });
  const getResult = actionTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  test('action type .index is registered', () => {
    expect(actionTypeModel.id).toEqual(ACTION_TYPE_ID);
    expect(actionTypeModel.iconClass).toEqual('indexOpen');
  });
});

describe('index connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        index: 'test_es_index',
      },
    } as ActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {},
    });

    delete actionConnector.config.index;
    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {},
    });
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      index: 'test',
      refresh: false,
      executionTimeField: '1',
      documents: ['test'],
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {},
    });

    const emptyActionParams = {};

    expect(actionTypeModel.validateParams(emptyActionParams)).toEqual({
      errors: {},
    });
  });
});

describe('IndexActionConnectorFields renders', () => {
  test('all connector fields is rendered', () => {
    expect(actionTypeModel.actionConnectorFields).not.toBeNull();
    if (!actionTypeModel.actionConnectorFields) {
      return;
    }
    const ConnectorFields = actionTypeModel.actionConnectorFields;
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        index: 'test',
      },
    } as ActionConnector;
    const wrapper = mountWithIntl(
      <ConnectorFields
        action={actionConnector}
        errors={{}}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        hasErrors={false}
      />
    );
    expect(wrapper.find('[data-test-subj="indexInput"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="indexInput"]')
        .first()
        .prop('value')
    ).toBe('test');
  });
});

describe('IndexParamsFields renders', () => {
  test('all params fields is rendered', () => {
    expect(actionTypeModel.actionParamsFields).not.toBeNull();
    if (!actionTypeModel.actionParamsFields) {
      return;
    }
    const ParamsFields = actionTypeModel.actionParamsFields;
    const actionParams = {
      index: 'test_index',
      refresh: false,
      documents: ['test'],
    };
    const wrapper = mountWithIntl(
      <ParamsFields
        action={actionParams}
        errors={{}}
        editAction={() => {}}
        index={0}
        hasErrors={false}
      />
    );
    expect(wrapper.find('[data-test-subj="indexInput"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="indexInput"]')
        .first()
        .prop('value')
    ).toBe('test_index');
    expect(wrapper.find('[data-test-subj="indexRefreshCheckbox"]').length > 0).toBeTruthy();
  });
});
