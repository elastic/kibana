/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleActionsConnectorsModal } from './rule_actions_connectors_modal';
import type { ActionConnector, ActionTypeModel } from '@kbn/alerts-ui-shared';
import { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import type { ActionType } from '@kbn/actions-types';
import {
  getActionType,
  getActionTypeModel,
  getConnector,
} from '../common/test_utils/actions_test_utils';

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
  useRuleFormScreenContext: jest.fn(),
}));

const { useRuleFormState, useRuleFormDispatch, useRuleFormScreenContext } =
  jest.requireMock('../hooks');

const mockConnectors: ActionConnector[] = [getConnector('1'), getConnector('2')];

const mockActionTypes: ActionType[] = [getActionType('1'), getActionType('2')];

const mockOnChange = jest.fn();

describe('ruleActionsConnectorsModal', () => {
  beforeEach(() => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(getActionTypeModel('2', { id: 'actionType-2' }));

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
      aadTemplateFields: [],
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
    useRuleFormScreenContext.mockReturnValue({
      setIsConnectorsScreenVisible: false,
      setIsShowRequestScreenVisible: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    render(<RuleActionsConnectorsModal />);
    expect(screen.getByTestId('ruleActionsConnectorsModal'));
  });

  test('should render connectors and filters', () => {
    render(<RuleActionsConnectorsModal />);

    expect(screen.getByText('connector-1')).toBeInTheDocument();
    expect(screen.getByText('connector-2')).toBeInTheDocument();

    expect(screen.getByTestId('ruleActionsConnectorsModalSearch')).toBeInTheDocument();
    expect(screen.getAllByTestId('ruleActionsConnectorsModalFilterButton').length).toEqual(3);

    const filterButtonGroup = screen.getByTestId('ruleActionsConnectorsModalFilterButtonGroup');
    expect(within(filterButtonGroup).getByText('actionType: 1')).toBeInTheDocument();
    expect(within(filterButtonGroup).getByText('actionType: 2')).toBeInTheDocument();
    expect(within(filterButtonGroup).getByText('All')).toBeInTheDocument();
  });

  test('should allow for searching of connectors', async () => {
    render(<RuleActionsConnectorsModal />);

    // Type first connector
    await userEvent.type(screen.getByTestId('ruleActionsConnectorsModalSearch'), 'connector-1');
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(1);
    expect(screen.getByText('connector-1')).toBeInTheDocument();

    // Clear
    await userEvent.clear(screen.getByTestId('ruleActionsConnectorsModalSearch'));

    // Type second connector
    await userEvent.type(screen.getByTestId('ruleActionsConnectorsModalSearch'), 'actionType: 2');
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(1);
    expect(screen.getByText('connector-2')).toBeInTheDocument();

    // Clear
    await userEvent.clear(screen.getByTestId('ruleActionsConnectorsModalSearch'));

    // Type a connector that doesn't exist
    await userEvent.type(screen.getByTestId('ruleActionsConnectorsModalSearch'), 'doesntexist');
    expect(screen.getByTestId('ruleActionsConnectorsModalEmpty')).toBeInTheDocument();

    // Clear
    await userEvent.click(screen.getByTestId('ruleActionsConnectorsModalClearFiltersButton'));
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(2);
  });

  test('should allow for filtering of connectors', async () => {
    render(<RuleActionsConnectorsModal />);

    const filterButtonGroup = screen.getByTestId('ruleActionsConnectorsModalFilterButtonGroup');

    await userEvent.click(within(filterButtonGroup).getByText('actionType: 1'));
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(1);
    expect(screen.getByText('connector-1')).toBeInTheDocument();

    await userEvent.click(within(filterButtonGroup).getByText('actionType: 2'));
    expect(screen.getByText('connector-2')).toBeInTheDocument();
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(1);

    await userEvent.click(within(filterButtonGroup).getByText('All'));
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(2);
  });

  test('should not render connector if action type doesnt exist', () => {
    render(<RuleActionsConnectorsModal />);

    expect(screen.queryByText('connector2')).not.toBeInTheDocument();
  });

  test('should not render connector if hideInUi is true', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(
      getActionTypeModel('2', { id: 'actionType-2', getHideInUi: () => true })
    );

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
    });

    render(<RuleActionsConnectorsModal />);

    expect(screen.queryByText('connector2')).not.toBeInTheDocument();
  });

  test('should not render connector filter if hideInUi is true', async () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(
      getActionTypeModel('1', {
        id: 'actionType-1',
        subtype: [
          { id: 'actionType-1', name: 'connector-1' },
          { id: 'actionType-2', name: 'connector-2' },
        ],
      })
    );
    actionTypeRegistry.register(
      getActionTypeModel('2', {
        id: 'actionType-2',
        getHideInUi: () => true,
        subtype: [
          { id: 'actionType-1', name: 'connector-1' },
          { id: 'actionType-2', name: 'connector-2' },
        ],
      })
    );
    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
    });

    render(<RuleActionsConnectorsModal />);
    const filterButtonGroup = screen.getByTestId('ruleActionsConnectorsModalFilterButtonGroup');
    expect(within(filterButtonGroup).getByText('actionType: 1')).toBeInTheDocument();
    expect(within(filterButtonGroup).queryByText('actionType: 2')).not.toBeInTheDocument();
    expect(within(filterButtonGroup).getByText('All')).toBeInTheDocument();

    expect(screen.getAllByTestId('ruleActionsConnectorsModalFilterButton').length).toEqual(2);
  });

  test('should display connectors if hideInUi is true and it has subtype', async () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(
      getActionTypeModel('1', {
        id: 'actionType-1',
        subtype: [
          { id: 'actionType-1', name: 'connector-1' },
          { id: 'actionType-2', name: 'connector-2' },
        ],
      })
    );
    actionTypeRegistry.register(
      getActionTypeModel('2', {
        id: 'actionType-2',
        getHideInUi: () => true,
        subtype: [
          { id: 'actionType-1', name: 'connector-1' },
          { id: 'actionType-2', name: 'connector-2' },
        ],
      })
    );
    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
    });

    render(<RuleActionsConnectorsModal />);
    const filterButtonGroup = screen.getByTestId('ruleActionsConnectorsModalFilterButtonGroup');

    await userEvent.click(within(filterButtonGroup).getByText('actionType: 1'));
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(2);
    expect(screen.getByText('connector-1')).toBeInTheDocument();
    expect(screen.getByText('connector-2')).toBeInTheDocument();
  });

  test('should display only subtype connector when only one of the subtype is enabled in config', async () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(
      getActionTypeModel('1', {
        id: 'actionType-1',
        getHideInUi: () => false,
        subtype: [
          { id: 'actionType-1', name: 'connector-1' },
          { id: 'actionType-2', name: 'connector-2' },
        ],
      })
    );
    actionTypeRegistry.register(
      getActionTypeModel('2', {
        id: 'actionType-2',
        getHideInUi: () => true,
        subtype: [
          { id: 'actionType-1', name: 'connector-1' },
          { id: 'actionType-2', name: 'connector-2' },
        ],
      })
    );
    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: [
        getActionType('1', { enabledInConfig: true }),
        getActionType('2', { enabledInConfig: false }),
      ],
    });

    render(<RuleActionsConnectorsModal />);
    const filterButtonGroup = screen.getByTestId('ruleActionsConnectorsModalFilterButtonGroup');

    await userEvent.click(within(filterButtonGroup).getByText('actionType: 1'));
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(1);
    expect(screen.getByText('connector-1')).toBeInTheDocument();
    expect(screen.queryByText('connector-2')).not.toBeInTheDocument();
  });

  test('should not render connector if actionsParamsField doesnt exist', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(
      getActionTypeModel('2', {
        id: 'actionType-2',
        actionParamsFields: null as unknown as React.LazyExoticComponent<any>,
      })
    );

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
    });

    render(<RuleActionsConnectorsModal />);

    expect(screen.queryByText('connector-2')).not.toBeInTheDocument();
  });

  test('should not render connector if the action type is not enabled', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();

    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(getActionTypeModel('2', { id: 'actionType-2' }));

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: [getActionType('1'), getActionType('2', { enabledInConfig: false })],
    });

    render(<RuleActionsConnectorsModal />);

    expect(screen.queryByText('connector-2')).not.toBeInTheDocument();
  });

  test('should render connector if the action is not enabled but its a preconfigured connector', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();

    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(getActionTypeModel('2', { id: 'actionType-2' }));

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: [getConnector('1'), getConnector('2', { isPreconfigured: true })],
      connectorTypes: [getActionType('1'), getActionType('2', { enabledInConfig: false })],
    });

    render(<RuleActionsConnectorsModal />);

    expect(screen.getByText('connector-2')).toBeInTheDocument();
  });

  test('should disable connector if it fails license check', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();

    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(getActionTypeModel('2', { id: 'actionType-2' }));

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: [getActionType('1'), getActionType('2', { enabledInLicense: false })],
    });

    render(<RuleActionsConnectorsModal />);

    expect(screen.getByText('connector-2')).toBeDisabled();
  });

  test('should disable connector if its a selected system action', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(
      getActionTypeModel('2', { isSystemActionType: true, id: 'actionType-2' })
    );

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [{ actionTypeId: 'actionType-2' }],
      },
      connectors: mockConnectors,
      connectorTypes: [getActionType('1'), getActionType('2', { isSystemActionType: true })],
    });

    render(<RuleActionsConnectorsModal />);

    expect(screen.getByText('connector-2')).toBeDisabled();
  });
});
