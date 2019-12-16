/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { setAppDependencies } from '../../../app_dependencies';
import { coreMock } from '../../../../../../../../../../src/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { alertTypeRegistryMock } from '../../../alert_type_registry.mock';
import { AlertsList } from './alerts_list';
import { ValidationResult } from '../../../../types';
jest.mock('../../../context/alerts_context');
jest.mock('../../../lib/action_connector_api', () => ({
  loadActionTypes: jest.fn(),
  loadAllActions: jest.fn(),
}));
jest.mock('../../../lib/alert_api', () => ({
  loadAlerts: jest.fn(),
  loadAlertTypes: jest.fn(),
}));

const actionTypeRegistry = actionTypeRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();

const alertType = {
  id: 'test_alert_type',
  name: 'some alert type',
  iconClass: 'test',
  alertType: {
    id: 'test_alert_type',
    name: 'some alert type',
    iconClass: 'test',
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    alertParamsExpression: () => null,
  },
};
alertTypeRegistry.list.mockReturnValue([alertType]);
actionTypeRegistry.list.mockReturnValue([]);

describe('alerts_list component empty', () => {
  let wrapper: ReactWrapper<any>;

  beforeEach(async () => {
    const { loadAlerts, loadAlertTypes } = jest.requireMock('../../../lib/alert_api');
    const { loadActionTypes, loadAllActions } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
    });
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    loadAlertTypes.mockResolvedValue([{ id: 'test_alert_type', name: 'some alert type' }]);
    loadAllActions.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
    });
    const deps = {
      core: {
        ...coreMock.createStart(),
        injectedMetadata: {
          getInjectedVar(name: string) {
            if (name === 'createAlertUiEnabled') {
              return true;
            }
          },
        },
      },
      plugins: {
        capabilities: {
          get() {
            return {
              siem: {
                'alerting:show': true,
                'alerting:save': true,
                'alerting:delete': true,
              },
            };
          },
        },
      } as any,
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: alertTypeRegistry as any,
    };
    const AppDependenciesProvider = setAppDependencies(deps);
    await act(async () => {
      wrapper = mountWithIntl(
        <AppDependenciesProvider value={deps}>
          <AlertsList />
        </AppDependenciesProvider>
      );
    });

    await waitForRender(wrapper);
  });

  it('renders empty list', () => {
    expect(wrapper.find('[data-test-subj="createAlertButton"]').find('EuiButton')).toHaveLength(1);
  });

  test('if click create button should render AlertAdd', () => {
    wrapper
      .find('[data-test-subj="createAlertButton"]')
      .first()
      .simulate('click');
    expect(wrapper.find('AlertAdd')).toHaveLength(1);
  });
});

describe('alerts_list component with items', () => {
  let wrapper: ReactWrapper<any>;

  beforeEach(async () => {
    const { loadAlerts, loadAlertTypes } = jest.requireMock('../../../lib/alert_api');
    const { loadActionTypes, loadAllActions } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 2,
      data: [
        {
          id: '1',
          name: 'test alert',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          interval: '5d',
          actions: [],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
        },
        {
          id: '2',
          name: 'test alert 2',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          interval: '5d',
          actions: [{ id: 'test', group: 'alert', params: { message: 'test' } }],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
        },
      ],
    });
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    loadAlertTypes.mockResolvedValue([{ id: 'test_alert_type', name: 'some alert type' }]);
    loadAllActions.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
    });
    const deps = {
      core: {
        ...coreMock.createStart(),
        injectedMetadata: {
          getInjectedVar(name: string) {
            if (name === 'createAlertUiEnabled') {
              return true;
            }
          },
        },
      },
      plugins: {
        capabilities: {
          get() {
            return {
              siem: {
                'alerting:show': true,
                'alerting:save': true,
                'alerting:delete': true,
              },
            };
          },
        },
      } as any,
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: alertTypeRegistry as any,
    };
    const AppDependenciesProvider = setAppDependencies(deps);

    await act(async () => {
      wrapper = mountWithIntl(
        <AppDependenciesProvider value={deps}>
          <AlertsList />
        </AppDependenciesProvider>
      );
    });

    await waitForRender(wrapper);

    expect(loadAlerts).toHaveBeenCalled();
    expect(loadActionTypes).toHaveBeenCalled();
  });

  it('renders table of connectors', () => {
    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
  });
});

describe('alerts_list component empty with show only capability', () => {
  let wrapper: ReactWrapper<any>;

  beforeEach(async () => {
    const { loadAlerts, loadAlertTypes } = jest.requireMock('../../../lib/alert_api');
    const { loadActionTypes, loadAllActions } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
    });
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    loadAlertTypes.mockResolvedValue([{ id: 'test_alert_type', name: 'some alert type' }]);
    loadAllActions.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
    });
    const deps = {
      core: {
        ...coreMock.createStart(),
        injectedMetadata: {
          getInjectedVar(name: string) {
            if (name === 'createAlertUiEnabled') {
              return true;
            }
          },
        },
      },
      plugins: {
        capabilities: {
          get() {
            return {
              siem: {
                'alerting:show': true,
                'alerting:save': false,
                'alerting:delete': false,
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
          <AlertsList />
        </AppDependenciesProvider>
      );
    });

    await waitForRender(wrapper);
  });

  it('not renders create alert button', () => {
    expect(wrapper.find('[data-test-subj="createAlertButton"]')).toHaveLength(0);
  });
});

describe('alerts_list with show only capability', () => {
  let wrapper: ReactWrapper<any>;

  beforeEach(async () => {
    const { loadAlerts, loadAlertTypes } = jest.requireMock('../../../lib/alert_api');
    const { loadActionTypes, loadAllActions } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 2,
      data: [
        {
          id: '1',
          name: 'test alert',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          interval: '5d',
          actions: [],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
        },
        {
          id: '2',
          name: 'test alert 2',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          interval: '5d',
          actions: [{ id: 'test', group: 'alert', params: { message: 'test' } }],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
        },
      ],
    });
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    loadAlertTypes.mockResolvedValue([{ id: 'test_alert_type', name: 'some alert type' }]);
    loadAllActions.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
    });
    const deps = {
      core: {
        ...coreMock.createStart(),
        injectedMetadata: {
          getInjectedVar(name: string) {
            if (name === 'createAlertUiEnabled') {
              return true;
            }
          },
        },
      },
      plugins: {
        capabilities: {
          get() {
            return {
              siem: {
                'alerting:show': true,
                'alerting:save': false,
                'alerting:delete': false,
              },
            };
          },
        },
      } as any,
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: alertTypeRegistry as any,
    };
    const AppDependenciesProvider = setAppDependencies(deps);

    await act(async () => {
      wrapper = mountWithIntl(
        <AppDependenciesProvider value={deps}>
          <AlertsList />
        </AppDependenciesProvider>
      );
    });

    await waitForRender(wrapper);
  });

  it('renders table of alerts with delete button disabled', () => {
    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
    // TODO: check delete button
  });
});

async function waitForRender(wrapper: ReactWrapper<any, any>) {
  await Promise.resolve();
  await Promise.resolve();
  wrapper.update();
}
