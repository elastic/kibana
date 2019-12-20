/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { coreMock } from '../../../../../../../../../src/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { ActionsConnectorsContextProvider } from '../../context/actions_connectors_context';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult, ActionConnector } from '../../../types';
import { ActionConnectorForm } from './action_connector_form';
import { AppContextProvider } from '../../app_context';
const actionTypeRegistry = actionTypeRegistryMock.create();

describe('action_connector_form', () => {
  let wrapper: ReactWrapper<any>;

  beforeAll(async () => {
    const mockes = coreMock.createSetup();
    const [{ chrome, docLinks }] = await mockes.getStartServices();
    const deps = {
      chrome,
      docLinks,
      toastNotifications: mockes.notifications.toasts,
      injectedMetadata: mockes.injectedMetadata,
      http: mockes.http,
      uiSettings: mockes.uiSettings,
      legacy: {
        capabilities: {
          get() {
            return {
              actions: {
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
      alertTypeRegistry: {} as any,
    };

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
    actionTypeRegistry.get.mockReturnValue(actionType);
    actionTypeRegistry.has.mockReturnValue(true);

    const initialConnector = {
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    } as ActionConnector;

    await act(async () => {
      wrapper = mountWithIntl(
        <AppContextProvider value={deps}>
          <ActionsConnectorsContextProvider
            value={{
              addFlyoutVisible: true,
              setAddFlyoutVisibility: () => {},
              editFlyoutVisible: false,
              setEditFlyoutVisibility: () => {},
              actionTypesIndex: {
                'my-action-type': { id: 'my-action-type', name: 'my-action-type-name' },
              },
              reloadConnectors: () => {
                return new Promise<void>(() => {});
              },
            }}
          >
            <ActionConnectorForm
              actionTypeName={'my-action-type-name'}
              initialConnector={initialConnector}
              setFlyoutVisibility={() => {}}
            />
          </ActionsConnectorsContextProvider>
        </AppContextProvider>
      );
    });

    await waitForRender(wrapper);
  });

  it('renders action_connector_form', () => {
    const connectorNameField = wrapper.find('[data-test-subj="nameInput"]');
    expect(connectorNameField.exists()).toBeTruthy();
    expect(connectorNameField.first().prop('value')).toBe('');
  });
});

async function waitForRender(wrapper: ReactWrapper<any, any>) {
  await Promise.resolve();
  await Promise.resolve();
  wrapper.update();
}
