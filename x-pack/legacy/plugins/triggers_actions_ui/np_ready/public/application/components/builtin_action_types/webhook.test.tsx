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

const ACTION_TYPE_ID = '.webhook';
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
    expect(actionTypeModel.iconClass).toEqual('logoWebhook');
  });
});

describe('webhook connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'http:\\test',
        headers: ['content-type: text'],
      },
    } as ActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        url: [],
        method: [],
        user: [],
        password: [],
      },
    });
  });

  test('connector validation fails when connector config is not valid', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
      },
      id: 'test',
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
      },
    } as ActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        url: ['Url is required.'],
        method: [],
        user: [],
        password: ['Password is required.'],
      },
    });
  });
});

describe('webhook action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      body: 'message {test}',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {},
    });
  });
});

describe('WebhookActionConnectorFields renders', () => {
  test('all connector fields is rendered', () => {
    expect(actionTypeModel.actionConnectorFields).not.toBeNull();
    if (!actionTypeModel.actionConnectorFields) {
      return;
    }
    const ConnectorFields = actionTypeModel.actionConnectorFields;
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'http:\\test',
        headers: ['content-type: text'],
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
    expect(wrapper.find('[data-test-subj="webhookAddHeaderButton"]').length > 0).toBeTruthy();
    wrapper
      .find('[data-test-subj="webhookAddHeaderButton"]')
      .first()
      .simulate('click');
    expect(wrapper.find('[data-test-subj="webhookHeadersKeyInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookHeaderText"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookHeadersValueInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookMethodSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUrlText"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookPasswordInput"]').length > 0).toBeTruthy();
  });
});

describe('WebhookParamsFields renders', () => {
  test('all params fields is rendered', () => {
    expect(actionTypeModel.actionParamsFields).not.toBeNull();
    if (!actionTypeModel.actionParamsFields) {
      return;
    }
    const ParamsFields = actionTypeModel.actionParamsFields;
    const actionParams = {
      body: 'test message',
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
    expect(wrapper.find('[data-test-subj="webhookBodyEditor"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="webhookBodyEditor"]')
        .first()
        .prop('value')
    ).toStrictEqual('test message');
  });
});
