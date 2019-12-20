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

const ACTION_TYPE_ID = '.slack';
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
    expect(actionTypeModel.iconClass).toEqual('logoSlack');
  });
});

describe('slack connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {},
    } as ActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        webhookUrl: [],
      },
    });
  });

  test('connector validation fails when connector config is not valid', () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {},
    } as ActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        webhookUrl: ['WebhookUrl is required.'],
      },
    });
  });
});

describe('slack action params validation', () => {
  test('if action params validation succeeds when action params is valid', () => {
    const actionParams = {
      message: 'message {test}',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {},
    });
  });

  test('if action params validation not fails when action params is empty', () => {
    const actionParams = {};

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {},
    });
  });
});

describe('SlackActionFields renders', () => {
  test('all connector fields is rendered', () => {
    expect(actionTypeModel.actionConnectorFields).not.toBeNull();
    if (!actionTypeModel.actionConnectorFields) {
      return;
    }
    const ConnectorFields = actionTypeModel.actionConnectorFields;
    const actionConnector = {
      secrets: {
        webhookUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {},
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
    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="slackWebhookUrlInput"]')
        .first()
        .prop('value')
    ).toBe('http:\\test');
  });
});

describe('SlackParamsFields renders', () => {
  test('all params fields is rendered', () => {
    expect(actionTypeModel.actionParamsFields).not.toBeNull();
    if (!actionTypeModel.actionParamsFields) {
      return;
    }
    const ParamsFields = actionTypeModel.actionParamsFields;
    const actionParams = {
      message: 'test message',
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
    expect(wrapper.find('[data-test-subj="slackMessageTextarea"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="slackMessageTextarea"]')
        .first()
        .prop('value')
    ).toStrictEqual('test message');
  });
});
