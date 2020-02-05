/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { act } from 'react-dom/test-utils';
import { coreMock } from '../../../../../../../../../src/core/public/mocks';
import { AlertAdd } from './alert_add';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult } from '../../../types';
import { AppContextProvider } from '../../app_context';
import { AppDeps } from '../../app';
import { AlertsContextProvider } from '../../context/alerts_context';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { ReactWrapper } from 'enzyme';
const actionTypeRegistry = actionTypeRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();

describe('alert_add', () => {
  let deps: AppDeps | null;
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
    deps = {
      chrome,
      docLinks,
      toastNotifications: mockes.notifications.toasts,
      injectedMetadata: mockes.injectedMetadata,
      http: mockes.http,
      uiSettings: mockes.uiSettings,
      capabilities: {
        ...capabilities,
        alerting: {
          delete: true,
          save: true,
          show: true,
        },
      },
      legacy: {
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
      alertParamsExpression: () => <React.Fragment />,
    };

    const actionTypeModel = {
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
    actionTypeRegistry.get.mockReturnValueOnce(actionTypeModel);
    actionTypeRegistry.has.mockReturnValue(true);
    alertTypeRegistry.list.mockReturnValue([alertType]);
    alertTypeRegistry.get.mockReturnValue(alertType);
    alertTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.list.mockReturnValue([actionTypeModel]);
    actionTypeRegistry.has.mockReturnValue(true);

    await act(async () => {
      wrapper = mountWithIntl(
        <AppContextProvider appDeps={deps}>
          <AlertsContextProvider
            value={{
              addFlyoutVisible: true,
              setAddFlyoutVisibility: state => {},
              reloadAlerts: () => {
                return new Promise<void>(() => {});
              },
            }}
          >
            <AlertAdd />
          </AlertsContextProvider>
        </AppContextProvider>
      );
    });
    await waitForRender(wrapper);
  });

  it('renders alert add flyout', () => {
    expect(wrapper.find('[data-test-subj="addAlertFlyoutTitle"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="saveAlertButton"]').exists()).toBeTruthy();
  });
});

async function waitForRender(wrapper: ReactWrapper<any, any>) {
  await Promise.resolve();
  await Promise.resolve();
  wrapper.update();
}
