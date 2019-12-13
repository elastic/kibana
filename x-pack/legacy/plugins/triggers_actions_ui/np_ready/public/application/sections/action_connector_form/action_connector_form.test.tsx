/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { setAppDependencies } from '../../app_dependencies';
import { coreMock } from '../../../../../../../../../src/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { ActionsConnectorsContext } from '../../context/actions_connectors_context';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult } from '../../../types';
import { ActionConnectorForm } from './action_connector_form';
jest.mock('../../context/actions_connectors_context');
const actionTypeRegistry = actionTypeRegistryMock.create();

describe('action_connector_form', () => {
  let wrapper: ReactWrapper<any>;

  beforeAll(async () => {
    const deps = {
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
    const AppDependenciesProvider = setAppDependencies(deps);

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

    const initialConnector = { actionTypeId: actionType.id, config: {}, secrets: {} };

    await act(async () => {
      wrapper = mountWithIntl(
        <AppDependenciesProvider value={deps}>
          <ActionsConnectorsContext.Provider
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
          </ActionsConnectorsContext.Provider>
        </AppDependenciesProvider>
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
