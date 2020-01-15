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

const ACTION_TYPE_ID = '.pagerduty';
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
    expect(actionTypeModel.iconClass).toEqual('apps');
  });
});

describe('pagerduty connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {
        routingKey: 'test',
      },
      id: 'test',
      actionTypeId: '.pagerduty',
      name: 'pagerduty',
      config: {
        apiUrl: 'http:\\test',
      },
    } as ActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        routingKey: [],
      },
    });

    delete actionConnector.config.apiUrl;
    actionConnector.secrets.routingKey = 'test1';
    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        routingKey: [],
      },
    });
  });

  test('connector validation fails when connector config is not valid', () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.pagerduty',
      name: 'pagerduty',
      config: {
        apiUrl: 'http:\\test',
      },
    } as ActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        routingKey: ['A routing key is required.'],
      },
    });
  });
});

describe('pagerduty action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: '234654564654',
      component: 'test',
      group: 'group',
      class: 'test class',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {},
    });
  });
});

describe('PagerDutyActionConnectorFields renders', () => {
  test('all connector fields is rendered', () => {
    expect(actionTypeModel.actionConnectorFields).not.toBeNull();
    if (!actionTypeModel.actionConnectorFields) {
      return;
    }
    const ConnectorFields = actionTypeModel.actionConnectorFields;
    const actionConnector = {
      secrets: {
        routingKey: 'test',
      },
      id: 'test',
      actionTypeId: '.pagerduty',
      name: 'pagerduty',
      config: {
        apiUrl: 'http:\\test',
      },
    } as ActionConnector;
    const wrapper = mountWithIntl(
      <ConnectorFields
        action={actionConnector}
        errors={{ routingKey: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        hasErrors={false}
      />
    );
    expect(wrapper.find('[data-test-subj="pagerdutyApiUrlInput"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="pagerdutyApiUrlInput"]')
        .first()
        .prop('value')
    ).toBe('http:\\test');
    expect(wrapper.find('[data-test-subj="pagerdutyRoutingKeyInput"]').length > 0).toBeTruthy();
  });
});

describe('PagerDutyParamsFields renders', () => {
  test('all params fields is rendered', () => {
    expect(actionTypeModel.actionParamsFields).not.toBeNull();
    if (!actionTypeModel.actionParamsFields) {
      return;
    }
    const ParamsFields = actionTypeModel.actionParamsFields;
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: '234654564654',
      component: 'test',
      group: 'group',
      class: 'test class',
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
    expect(wrapper.find('[data-test-subj="severitySelect"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="severitySelect"]')
        .first()
        .prop('value')
    ).toStrictEqual('critical');
    expect(wrapper.find('[data-test-subj="eventActionSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="timestampInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="componentInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="groupInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="sourceInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="pagerdutyDescriptionInput"]').length > 0).toBeTruthy();
  });
});
