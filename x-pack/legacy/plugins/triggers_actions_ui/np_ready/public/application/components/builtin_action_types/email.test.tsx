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

const ACTION_TYPE_ID = '.email';
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
    expect(actionTypeModel.iconClass).toEqual('email');
  });
});

describe('connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        port: '2323',
        host: 'localhost',
        test: 'test',
      },
    } as ActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        from: [],
        service: [],
        port: [],
        host: [],
        user: [],
        password: [],
      },
    });

    delete actionConnector.config.test;
    actionConnector.config.host = 'elastic.co';
    actionConnector.config.port = 8080;
    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        from: [],
        service: [],
        port: [],
        host: [],
        user: [],
        password: [],
      },
    });
    delete actionConnector.config.host;
    delete actionConnector.config.port;
    actionConnector.config.service = 'testService';
    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        from: [],
        service: [],
        port: [],
        host: [],
        user: [],
        password: [],
      },
    });
  });

  test('connector validation fails when connector config is not valid', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
      },
    } as ActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        from: [],
        service: ['Service is required.'],
        port: ['Port is required.'],
        host: ['Host is required.'],
        user: [],
        password: [],
      },
    });
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      to: [],
      cc: ['test1@test.com'],
      message: 'message {test}',
      subject: 'test',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        to: [],
        cc: [],
        bcc: [],
        message: [],
        subject: [],
      },
    });
  });

  test('action params validation fails when action params is not valid', () => {
    const actionParams = {
      to: ['test@test.com'],
      subject: 'test',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        to: [],
        cc: [],
        bcc: [],
        message: ['Message is required.'],
        subject: [],
      },
    });
  });
});

describe('EmailActionConnectorFields renders', () => {
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
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
      },
    } as ActionConnector;
    const wrapper = mountWithIntl(
      <ConnectorFields
        action={actionConnector}
        errors={{ from: [], service: [], port: [], host: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        hasErrors={false}
      />
    );
    expect(wrapper.find('[data-test-subj="emailFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="emailFromInput"]')
        .first()
        .prop('value')
    ).toBe('test@test.com');
    expect(wrapper.find('[data-test-subj="emailHostInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailPortInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailPasswordInput"]').length > 0).toBeTruthy();
  });
});

describe('EmailParamsFields renders', () => {
  test('all params fields is rendered', () => {
    expect(actionTypeModel.actionParamsFields).not.toBeNull();
    if (!actionTypeModel.actionParamsFields) {
      return;
    }
    const ParamsFields = actionTypeModel.actionParamsFields;
    const actionParams = {
      to: ['test@test.com'],
      subject: 'test',
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
    expect(wrapper.find('[data-test-subj="toEmailAddressInput"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="toEmailAddressInput"]')
        .first()
        .prop('selectedOptions')
    ).toStrictEqual([{ label: 'test@test.com' }]);
    expect(wrapper.find('[data-test-subj="ccEmailAddressInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bccEmailAddressInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailSubjectInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailMessageInput"]').length > 0).toBeTruthy();
  });
});
