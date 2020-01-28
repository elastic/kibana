/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { coreMock } from '../../../../../../../../../src/core/public/mocks';
import { ConnectorAddModal } from './connector_add_modal';
import { ActionsConnectorsContextProvider } from '../../context/actions_connectors_context';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult } from '../../../types';
import { AppContextProvider } from '../../app_context';
import { AppDeps } from '../../app';
const actionTypeRegistry = actionTypeRegistryMock.create();

describe('connector_add_modal', () => {
  let deps: AppDeps | null;

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
        actions: {
          delete: true,
          save: true,
          show: true,
        },
      },
      legacy: {
        MANAGEMENT_BREADCRUMB: { set: () => {} } as any,
      },
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: {} as any,
    };
  });
  it('renders connector modal form if addModalVisible is true', () => {
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

    const actionType = {
      id: 'my-action-type',
      name: 'test',
    };

    const wrapper = mountWithIntl(
      <AppContextProvider appDeps={deps}>
        <ActionsConnectorsContextProvider
          value={{
            addFlyoutVisible: true,
            setAddFlyoutVisibility: state => {},
            editFlyoutVisible: false,
            setEditFlyoutVisibility: state => {},
            actionTypesIndex: { 'my-action-type': { id: 'my-action-type', name: 'test' } },
            reloadConnectors: () => {
              return new Promise<void>(() => {});
            },
          }}
        >
          <ConnectorAddModal
            addModalVisible={true}
            setAddModalVisibility={() => {}}
            actionType={actionType}
          />
        </ActionsConnectorsContextProvider>
      </AppContextProvider>
    );
    expect(wrapper.find('EuiModalHeader')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="saveActionButtonModal"]').exists()).toBeTruthy();
  });
});
