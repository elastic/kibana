/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleActionsConnectorsBody } from './rule_actions_connectors_body';
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
}));

jest.mock('../utils', () => ({
  getDefaultParams: jest.fn(),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

const mockConnectors: ActionConnector[] = [getConnector('1'), getConnector('2')];

const mockActionTypes: ActionType[] = [getActionType('1'), getActionType('2')];

const mockOnSelectConnector = jest.fn();

const mockOnChange = jest.fn();

describe('ruleActionsConnectorsBody', () => {
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
      selectedRuleType: {
        defaultActionGroupId: 'default',
      },
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call onSelectConnector when connector is clicked', async () => {
    render(<RuleActionsConnectorsBody onSelectConnector={mockOnSelectConnector} />);

    await userEvent.click(screen.getByText('connector-1'));
    await waitFor(() =>
      expect(mockOnSelectConnector).toHaveBeenLastCalledWith({
        actionTypeId: 'actionType-1',
        config: { config: 'config-1' },
        id: 'connector-1',
        isDeprecated: false,
        isPreconfigured: false,
        isSystemAction: false,
        name: 'connector-1',
        secrets: { secret: 'secret' },
        isConnectorTypeDeprecated: false,
      })
    );

    await userEvent.click(screen.getByText('connector-2'));
    await waitFor(() =>
      expect(mockOnSelectConnector).toHaveBeenLastCalledWith({
        actionTypeId: 'actionType-2',
        config: { config: 'config-2' },
        id: 'connector-2',
        isDeprecated: false,
        isPreconfigured: false,
        isSystemAction: false,
        name: 'connector-2',
        secrets: { secret: 'secret' },
        isConnectorTypeDeprecated: false,
      })
    );
  });

  it('filters out when no connector matched action type id', async () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: [
        ...mockConnectors,
        {
          id: `connector-foobar-1`,
          secrets: { secret: 'secret' },
          actionTypeId: `actionType-foobar`,
          name: `connector-foobar`,
          config: { config: `config-foobar-1` },
          isPreconfigured: true,
          isSystemAction: false,
          isDeprecated: false,
        },
      ],
      connectorTypes: mockActionTypes,
      aadTemplateFields: [],
      selectedRuleType: {
        defaultActionGroupId: 'default',
      },
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
    render(<RuleActionsConnectorsBody onSelectConnector={mockOnSelectConnector} />);

    expect(screen.queryByText('connector-foobar')).not.toBeInTheDocument();
    expect(screen.queryByText('connector-2')).not.toBeInTheDocument();

    expect(await screen.findAllByTestId('ruleActionsConnectorsModalCard')).toHaveLength(1);
    expect(await screen.findByText('connector-1')).toBeInTheDocument();
  });

  it('filters out when connector should be hidden in UI', async () => {
    const connectorTypes = [
      { id: '.slack', name: 'Slack', enabledInConfig: false },
      { id: '.slack_api', name: 'Slack API', enabledInConfig: true },
      { id: '.cases', name: 'Cases', enabledInConfig: true },
    ];

    const availableConnectors = [
      { actionTypeId: '.slack', name: 'Slack' },
      { actionTypeId: '.slack_api', name: 'Slack API' },
      { actionTypeId: '.cases', name: 'Cases' },
    ];

    const subtype = [
      { id: '.slack_api', name: 'Slack API' },
      { id: '.slack', name: 'Slack' },
    ];
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(
      getActionTypeModel('Slack', {
        id: '.slack',
        subtype,
        getHideInUi: () => true,
      })
    );
    actionTypeRegistry.register(
      getActionTypeModel('Slack API', {
        id: '.slack_api',
        subtype,
        getHideInUi: () => false,
      })
    );
    actionTypeRegistry.register(
      getActionTypeModel('Cases', {
        id: '.cases',
      })
    );

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: [...availableConnectors],
      connectorTypes,
      aadTemplateFields: [],
      selectedRuleType: {
        defaultActionGroupId: 'default',
      },
    });

    render(<RuleActionsConnectorsBody onSelectConnector={mockOnSelectConnector} />);

    const modalCards = await screen.findAllByTestId('ruleActionsConnectorsModalCard');
    expect(modalCards).toHaveLength(2);
    expect(modalCards[0]).toHaveTextContent('Slack API');
    expect(modalCards[1]).toHaveTextContent('Cases');

    expect(screen.queryByText('Slack')).not.toBeInTheDocument();

    const filterButtons = await screen.findAllByTestId('ruleActionsConnectorsModalFilterButton');
    expect(filterButtons).toHaveLength(3);
    expect(filterButtons[0]).toHaveTextContent('All');
    expect(filterButtons[1]).toHaveTextContent('Cases');
    expect(filterButtons[2]).toHaveTextContent('Slack API');
  });

  it('should not allow selecting system actions more that once if allowMultipleSystemActions=false', async () => {
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
        // simulate that a system action of type actionType-2 is already selected
        actions: [{ actionTypeId: 'actionType-2' }],
      },
      connectors: mockConnectors,
      connectorTypes: [getActionType('1'), getActionType('2', { isSystemActionType: true })],
      aadTemplateFields: [],
      selectedRuleType: {
        defaultActionGroupId: 'default',
      },
    });

    useRuleFormDispatch.mockReturnValue(mockOnChange);

    render(<RuleActionsConnectorsBody onSelectConnector={mockOnSelectConnector} />);

    const connector2 = await screen.findByText('connector-2');
    expect(connector2).toBeDisabled();
  });

  it('should allow selecting system actions more that once if allowMultipleSystemActions=true', async () => {
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
        // simulate that a system action of type actionType-2 is already selected
        actions: [{ actionTypeId: 'actionType-2' }],
      },
      connectors: mockConnectors,
      connectorTypes: [
        getActionType('1'),
        getActionType('2', { allowMultipleSystemActions: true, isSystemActionType: true }),
      ],
      aadTemplateFields: [],
      selectedRuleType: {
        defaultActionGroupId: 'default',
      },
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);

    render(<RuleActionsConnectorsBody onSelectConnector={mockOnSelectConnector} />);

    const connector2 = await screen.findByText('connector-2');
    expect(connector2).not.toBeDisabled();
  });
});
