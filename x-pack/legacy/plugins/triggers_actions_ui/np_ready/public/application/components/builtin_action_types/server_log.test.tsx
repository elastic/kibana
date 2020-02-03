/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { TypeRegistry } from '../../type_registry';
import { registerBuiltInActionTypes } from './index';
import { ActionTypeModel, ActionConnector } from '../../../types';

const ACTION_TYPE_ID = '.server-log';
let actionTypeModel: ActionTypeModel;

beforeAll(() => {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerBuiltInActionTypes({ actionTypeRegistry });
  const getResult = actionTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(actionTypeModel.id).toEqual(ACTION_TYPE_ID);
    expect(actionTypeModel.iconClass).toEqual('logsApp');
  });
});

describe('server-log connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.server-log',
      name: 'server-log',
      config: {},
    } as ActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {},
    });
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      message: 'test message',
      level: 'trace',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { message: [] },
    });
  });
});

describe('ServerLogParamsFields renders', () => {
  test('all params fields is rendered', () => {
    expect(actionTypeModel.actionParamsFields).not.toBeNull();
    if (!actionTypeModel.actionParamsFields) {
      return;
    }
    const ParamsFields = actionTypeModel.actionParamsFields;
    const actionParams = {
      message: 'test message',
      level: 'trace',
    };
    const wrapper = mountWithIntl(
      <ParamsFields
        action={actionParams}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
        hasErrors={false}
      />
    );
    expect(wrapper.find('[data-test-subj="loggingLevelSelect"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="loggingLevelSelect"]')
        .first()
        .prop('value')
    ).toStrictEqual('trace');
    expect(wrapper.find('[data-test-subj="loggingMessageInput"]').length > 0).toBeTruthy();
  });

  test('level param field is rendered with default value if not selected', () => {
    expect(actionTypeModel.actionParamsFields).not.toBeNull();
    if (!actionTypeModel.actionParamsFields) {
      return;
    }
    const ParamsFields = actionTypeModel.actionParamsFields;
    const actionParams = {
      message: 'test message',
      level: 'info',
    };
    const wrapper = mountWithIntl(
      <ParamsFields
        action={actionParams}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
        hasErrors={false}
      />
    );
    expect(wrapper.find('[data-test-subj="loggingLevelSelect"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="loggingLevelSelect"]')
        .first()
        .prop('value')
    ).toStrictEqual('info');
    expect(wrapper.find('[data-test-subj="loggingMessageInput"]').length > 0).toBeTruthy();
  });

  test('params validation fails when message is not valid', () => {
    const actionParams = {
      message: '',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        message: ['Message is required.'],
      },
    });
  });
});
