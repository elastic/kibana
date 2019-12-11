/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ActionsConnectorsList } from './actions_connectors_list';
import { setAppDependencies } from '../../../app_dependencies';
import { coreMock } from '../../../../../../../../../../src/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
jest.mock('../../../context/actions_connectors_context');
jest.mock('../../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
}));

const actionTypeRegistry = actionTypeRegistryMock.create();

describe('actions_connectors_list component empty', () => {
  let wrapper: ReactWrapper<any>;

  beforeAll(async () => {
    const { loadAllActions, loadActionTypes } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAllActions.mockResolvedValueOnce({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
    });
    loadActionTypes.mockResolvedValueOnce([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
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
    actionTypeRegistry.has.mockReturnValue(true);

    await act(async () => {
      wrapper = mountWithIntl(
        <AppDependenciesProvider value={deps}>
          <ActionsConnectorsList />
        </AppDependenciesProvider>
      );
    });

    await waitForRender(wrapper);
  });

  it('renders empty prompt', () => {
    expect(wrapper.find('EuiEmptyPrompt')).toHaveLength(1);
    expect(
      wrapper.find('[data-test-subj="createFirstActionButton"]').find('EuiButton')
    ).toHaveLength(1);
  });

  test('if click create button should render ConnectorAddFlyout', () => {
    wrapper
      .find('[data-test-subj="createFirstActionButton"]')
      .first()
      .simulate('click');
    expect(wrapper.find('ConnectorAddFlyout')).toHaveLength(1);
  });
});

describe('actions_connectors_list component with items', () => {
  let wrapper: ReactWrapper<any>;

  beforeAll(async () => {
    const { loadAllActions, loadActionTypes } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAllActions.mockResolvedValueOnce({
      page: 1,
      perPage: 10000,
      total: 2,
      data: [
        {
          id: '1',
          actionTypeId: 'test',
          description: 'My test',
          referencedByCount: 1,
          config: {},
        },
        {
          id: '2',
          actionTypeId: 'test2',
          description: 'My test 2',
          referencedByCount: 1,
          config: {},
        },
      ],
    });
    loadActionTypes.mockResolvedValueOnce([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
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
      actionTypeRegistry: {
        get() {
          return null;
        },
      } as any,
      alertTypeRegistry: {} as any,
    };
    const AppDependenciesProvider = setAppDependencies(deps);

    await act(async () => {
      wrapper = mountWithIntl(
        <AppDependenciesProvider value={deps}>
          <ActionsConnectorsList />
        </AppDependenciesProvider>
      );
    });

    await waitForRender(wrapper);

    expect(loadAllActions).toHaveBeenCalled();
  });

  it('renders table of connectors', () => {
    expect(wrapper.find('EuiInMemoryTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
  });

  test('if select item for edit should render ConnectorEditFlyout', () => {
    wrapper
      .find('[data-test-subj="edit1"]')
      .first()
      .simulate('click');
    expect(wrapper.find('ConnectorEditFlyout')).toHaveLength(1);
  });
});

describe('actions_connectors_list component empty with show only capability', () => {
  let wrapper: ReactWrapper<any>;

  beforeAll(async () => {
    const { loadAllActions, loadActionTypes } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAllActions.mockResolvedValueOnce({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
    });
    loadActionTypes.mockResolvedValueOnce([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    const deps = {
      core: coreMock.createStart(),
      plugins: {
        capabilities: {
          get() {
            return {
              actions: {
                delete: false,
                save: false,
                show: true,
              },
            };
          },
        },
      } as any,
      actionTypeRegistry: {
        get() {
          return null;
        },
      } as any,
      alertTypeRegistry: {} as any,
    };
    const AppDependenciesProvider = setAppDependencies(deps);

    await act(async () => {
      wrapper = mountWithIntl(
        <AppDependenciesProvider value={deps}>
          <ActionsConnectorsList />
        </AppDependenciesProvider>
      );
    });

    await waitForRender(wrapper);
  });

  it('renders no permissions to create connector', () => {
    expect(wrapper.find('[defaultMessage="No permissions to create connector"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="createActionButton"]')).toHaveLength(0);
  });
});

describe('actions_connectors_list with show only capability', () => {
  let wrapper: ReactWrapper<any>;

  beforeAll(async () => {
    const { loadAllActions, loadActionTypes } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAllActions.mockResolvedValueOnce({
      page: 1,
      perPage: 10000,
      total: 2,
      data: [
        {
          id: '1',
          actionTypeId: 'test',
          description: 'My test',
          referencedByCount: 1,
          config: {},
        },
        {
          id: '2',
          actionTypeId: 'test2',
          description: 'My test 2',
          referencedByCount: 1,
          config: {},
        },
      ],
    });
    loadActionTypes.mockResolvedValueOnce([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    const deps = {
      core: coreMock.createStart(),
      plugins: {
        capabilities: {
          get() {
            return {
              actions: {
                delete: false,
                save: false,
                show: true,
              },
            };
          },
        },
      } as any,
      actionTypeRegistry: {
        get() {
          return null;
        },
      } as any,
      alertTypeRegistry: {} as any,
    };
    const AppDependenciesProvider = setAppDependencies(deps);

    await act(async () => {
      wrapper = mountWithIntl(
        <AppDependenciesProvider value={deps}>
          <ActionsConnectorsList />
        </AppDependenciesProvider>
      );
    });

    await waitForRender(wrapper);
  });

  it('renders table of connectors with delete button disabled', () => {
    expect(wrapper.find('EuiInMemoryTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
    wrapper.find('EuiTableRow').forEach(elem => {
      const deleteButton = elem.find('[data-test-subj="deleteConnector"]').first();
      expect(deleteButton).toBeTruthy();
      expect(deleteButton.prop('isDisabled')).toBeTruthy();
    });
  });
});

async function waitForRender(wrapper: ReactWrapper<any, any>) {
  await Promise.resolve();
  await Promise.resolve();
  wrapper.update();
}
