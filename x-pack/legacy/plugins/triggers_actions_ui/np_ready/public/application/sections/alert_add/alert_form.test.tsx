/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { coreMock } from '../../../../../../../../../src/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { ValidationResult, Alert } from '../../../types';
import { AlertForm } from './alert_form';
import { AppContextProvider } from '../../app_context';
import { AlertsContextProvider } from '../../context/alerts_context';
const actionTypeRegistry = actionTypeRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();

describe('alert_form', () => {
  let wrapper: ReactWrapper<any>;

  beforeAll(async () => {
    const mockes = coreMock.createSetup();
    const [
      {
        chrome,
        docLinks,
        application: { capabilities },
      },
    ] = await mockes.getStartServices();
    const deps = {
      chrome,
      docLinks,
      toastNotifications: mockes.notifications.toasts,
      injectedMetadata: mockes.injectedMetadata,
      http: mockes.http,
      uiSettings: mockes.uiSettings,
      capabilities: {
        ...capabilities,
        siem: {
          'actions:show': true,
          'actions:save': false,
          'actions:delete': false,
        },
      },
      legacy: {
        capabilities: {
          get() {
            return {
              alerting: {
                delete: true,
                save: true,
                show: true,
              },
            };
          },
        } as any,
        MANAGEMENT_BREADCRUMB: { set: () => {} } as any,
      },
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: alertTypeRegistry as any,
    };

    const alertType = {
      id: 'my-alert-type',
      iconClass: 'test',
      name: 'test-alert',
      validate: (): ValidationResult => {
        return { errors: {} };
      },
      alertParamsExpression: () => <Fragment />,
    };
    alertTypeRegistry.list.mockReturnValue([alertType]);
    alertTypeRegistry.has.mockReturnValue(true);

    const actionType = {
      id: 'my-action-type',
      iconClass: 'test',
      selectMessage: 'test',
      validateConnector: (): ValidationResult => {
        return { errors: {} };
      },
      validateParams: (): ValidationResult => {
        const validationResult = { errors: {} };
        return validationResult;
      },
      actionConnectorFields: null,
      actionParamsFields: null,
    };
    actionTypeRegistry.list.mockReturnValue([actionType]);
    actionTypeRegistry.has.mockReturnValue(true);

    const initialAlert = ({
      name: 'test',
      alertTypeId: alertType.id,
      params: {},
      consumer: 'alerting',
      schedule: {
        interval: '1m',
      },
      actions: [],
      tags: [],
      muteAll: false,
      enabled: false,
      mutedInstanceIds: [],
    } as unknown) as Alert;

    await act(async () => {
      wrapper = mountWithIntl(
        <AppContextProvider appDeps={deps}>
          <AlertsContextProvider
            value={{
              reloadAlerts: () => {
                return new Promise<void>(() => {});
              },
              addFlyoutVisible: true,
              setAddFlyoutVisibility: () => {},
            }}
          >
            <AlertForm initialAlert={initialAlert} setFlyoutVisibility={() => {}} />
          </AlertsContextProvider>
        </AppContextProvider>
      );
    });

    await waitForRender(wrapper);
  });

  it('renders alert name', () => {
    const alertNameField = wrapper.find('[data-test-subj="alertNameInput"]');
    expect(alertNameField.exists()).toBeTruthy();
    expect(alertNameField.first().prop('value')).toBe('test');
  });

  it('renders registered alert types', () => {
    const alertTypeSelectOptions = wrapper.find('[data-test-subj="alertTypeSelectOption"]');
    expect(alertTypeSelectOptions.exists()).toBeTruthy();
    expect(alertTypeSelectOptions.first().prop('label')).toBe('test-alert');
  });

  it('renders registered action types', () => {
    const alertTypeSelectOptions = wrapper.find('[data-test-subj="actionTypeSelectOption"]');
    expect(alertTypeSelectOptions.exists()).toBeTruthy();
  });
});

async function waitForRender(wrapper: ReactWrapper<any, any>) {
  await Promise.resolve();
  await Promise.resolve();
  wrapper.update();
}
