/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { setAppDependencies } from '../../app_dependencies';
import { coreMock } from '../../../../../../../../../src/core/public/mocks';
import { ActionsConnectorsContext } from '../../context/actions_connectors_context';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { AppDependencies } from '../../../../../public/shim';
import { ActionTypeMenu } from './action_type_menu';
import { ValidationResult } from '../../../types';
jest.mock('../../context/actions_connectors_context');
const actionTypeRegistry = actionTypeRegistryMock.create();

describe('connector_add_flyout', () => {
  let AppDependenciesProvider: React.ProviderExoticComponent<React.ProviderProps<AppDependencies>>;
  let deps: any;

  beforeAll(() => {
    deps = {
      core: coreMock.createStart(),
      plugins: {
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
        },
      } as any,
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: {} as any,
    };
    AppDependenciesProvider = setAppDependencies(deps);
  });

  it('renders action type menu with proper EuiCards for registered action types', () => {
    const onActionTypeChange = jest.fn();
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
    actionTypeRegistry.get.mockReturnValueOnce(actionType);

    const wrapper = mountWithIntl(
      <AppDependenciesProvider value={deps}>
        <ActionsConnectorsContext.Provider
          value={{
            addFlyoutVisible: true,
            setAddFlyoutVisibility: state => {},
            editFlyoutVisible: false,
            setEditFlyoutVisibility: state => {},
            actionTypesIndex: {
              'first-action-type': { id: 'first-action-type', name: 'first' },
              'second-action-type': { id: 'second-action-type', name: 'second' },
            },
            reloadConnectors: () => {
              return new Promise<void>(() => {});
            },
          }}
        >
          <ActionTypeMenu onActionTypeChange={onActionTypeChange} />
        </ActionsConnectorsContext.Provider>
      </AppDependenciesProvider>
    );

    expect(wrapper.find('[data-test-subj="first-action-type-card"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="second-action-type-card"]').exists()).toBeTruthy();
  });
});
