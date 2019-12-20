/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { coreMock } from '../../../../../../../../../src/core/public/mocks';
import { ActionsConnectorsContextProvider } from '../../context/actions_connectors_context';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult } from '../../../types';
import { ConnectorEditFlyout } from './connector_edit_flyout';
import { AppContextProvider } from '../../app_context';
const actionTypeRegistry = actionTypeRegistryMock.create();
let deps: any;

describe('connector_edit_flyout', () => {
  beforeAll(async () => {
    const mockes = coreMock.createSetup();
    const [{ chrome, docLinks }] = await mockes.getStartServices();
    deps = {
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
  });

  test('if input connector render correct in the edit form', () => {
    const connector = {
      secrets: {},
      id: 'test',
      actionTypeId: 'test-action-type-id',
      actionType: 'test-action-type-name',
      name: 'action-connector',
      referencedByCount: 0,
      config: {},
    };

    const actionType = {
      id: 'test-action-type-id',
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

    const wrapper = mountWithIntl(
      <AppContextProvider value={deps}>
        <ActionsConnectorsContextProvider
          value={{
            addFlyoutVisible: false,
            setAddFlyoutVisibility: state => {},
            editFlyoutVisible: true,
            setEditFlyoutVisibility: state => {},
            actionTypesIndex: {
              'test-action-type-id': { id: 'test-action-type-id', name: 'test' },
            },
            reloadConnectors: () => {
              return new Promise<void>(() => {});
            },
          }}
        >
          <ConnectorEditFlyout connector={connector} />
        </ActionsConnectorsContextProvider>
      </AppContextProvider>
    );

    const connectorNameField = wrapper.find('[data-test-subj="nameInput"]');
    expect(connectorNameField.exists()).toBeTruthy();
    expect(connectorNameField.first().prop('value')).toBe('action-connector');
  });
});
