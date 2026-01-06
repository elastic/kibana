/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { screen, render } from '@testing-library/react';
import { RuleActions } from './rule_actions';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import type { ActionConnector, ActionTypeModel } from '../../../../types';
import * as useFetchRuleActionConnectorsHook from '../../../hooks/use_fetch_rule_action_connectors';

const actionTypeRegistry = actionTypeRegistryMock.create();
const actionType = {
  id: 'test',
  name: 'Test',
  isSystemActionType: false,
} as unknown as ActionTypeModel;

const mockedUseFetchRuleActionConnectorsHook = jest.spyOn(
  useFetchRuleActionConnectorsHook,
  'useFetchRuleActionConnectors'
);

describe('Rule Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    actionTypeRegistry.get.mockReturnValue(actionType);
  });

  it("renders rule action connector icons for user's selected rule actions", async () => {
    const ruleActions = [
      {
        id: '1',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.server-log',
        params: {},
      },
      {
        id: '2',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.slack',
        params: {},
      },
    ];

    mockedUseFetchRuleActionConnectorsHook.mockReturnValue({
      isLoadingActionConnectors: false,
      actionConnectors: [
        {
          id: 'f57cabc0-e660-11ec-8241-7deb55b17f15',
          name: 'logs',
          config: {},
          actionTypeId: '.server-log',
        },
        {
          id: '05b7ab30-e683-11ec-843b-213c67313f8c',
          name: 'Slack',
          actionTypeId: '.slack',
        },
      ] as Array<ActionConnector<Record<string, unknown>>>,
      errorActionConnectors: undefined,
      reloadRuleActionConnectors: jest.fn(),
    });

    actionTypeRegistry.list.mockReturnValue([
      { id: '.server-log', iconClass: 'logsApp' },
      { id: '.slack', iconClass: 'logoSlack' },
      { id: '.email', iconClass: 'email' },
      { id: '.index', iconClass: 'indexOpen' },
    ] as ActionTypeModel[]);

    render(<RuleActions ruleActions={ruleActions} actionTypeRegistry={actionTypeRegistry} />);
    expect(mockedUseFetchRuleActionConnectorsHook).toHaveBeenCalledTimes(1);

    const logsAppIcons = screen.getAllByTestId('ruleActionIcon-logsApp');
    const slackIcons = screen.getAllByTestId('ruleActionIcon-logoSlack');
    const indexIcons = screen.queryAllByTestId('ruleActionIcon-indexOpen');
    const emailIcons = screen.queryAllByTestId('ruleActionIcon-email');

    expect(logsAppIcons).toHaveLength(1);
    expect(slackIcons).toHaveLength(1);
    expect(indexIcons).toHaveLength(0);
    expect(emailIcons).toHaveLength(0);
  });

  it('renders multiple rule action connectors of the same type and connector', async () => {
    const ruleActions = [
      {
        id: '1',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.server-log',
        params: {},
      },
      {
        id: '1',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.server-log',
        params: {},
      },
      {
        id: '2',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.server-log',
        params: {},
      },
      {
        id: '3',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.slack',
        params: {},
      },
      {
        id: '4',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.slack',
        params: {},
      },
    ];

    mockedUseFetchRuleActionConnectorsHook.mockReturnValue({
      isLoadingActionConnectors: false,
      actionConnectors: [
        {
          id: '1',
          name: 'logs1',
          config: {},
          actionTypeId: '.server-log',
        },
        {
          id: '2',
          name: 'logs2',
          config: {},
          actionTypeId: '.server-log',
        },
        {
          id: '3',
          name: 'Slack1',
          actionTypeId: '.slack',
        },
        {
          id: '4',
          name: 'Slack1',
          actionTypeId: '.slack',
        },
      ] as Array<ActionConnector<Record<string, unknown>>>,
      errorActionConnectors: undefined,
      reloadRuleActionConnectors: jest.fn(),
    });

    actionTypeRegistry.list.mockReturnValue([
      { id: '.server-log', iconClass: 'logsApp' },
      { id: '.slack', iconClass: 'logoSlack' },
      { id: '.email', iconClass: 'email' },
      { id: '.index', iconClass: 'indexOpen' },
    ] as ActionTypeModel[]);

    render(<RuleActions ruleActions={ruleActions} actionTypeRegistry={actionTypeRegistry} />);

    expect(screen.getByTestId('actionConnectorName-0-logs1')).toBeInTheDocument();
    expect(screen.getByTestId('actionConnectorName-1-logs1')).toBeInTheDocument();
    expect(screen.getByTestId('actionConnectorName-2-logs2')).toBeInTheDocument();
    expect(screen.getByTestId('actionConnectorName-3-Slack1')).toBeInTheDocument();
    expect(screen.getByTestId('actionConnectorName-4-Slack1')).toBeInTheDocument();
  });

  it('shows the correct notify text for system actions', async () => {
    const ruleActions = [
      {
        id: 'system-connector-.test-system-action',
        actionTypeId: '.test-system-action',
        params: {},
      },
    ];

    actionTypeRegistry.list.mockReturnValue([
      { id: '.test-system-action', iconClass: 'logsApp' },
    ] as ActionTypeModel[]);

    actionTypeRegistry.get.mockReturnValue({
      ...actionType,
      isSystemActionType: true,
      id: '.test-system-action',
    });

    mockedUseFetchRuleActionConnectorsHook.mockReturnValue({
      isLoadingActionConnectors: false,
      actionConnectors: [
        {
          id: 'system-connector-.test-system-action',
          actionTypeId: '.test-system-action',
        },
      ] as Array<ActionConnector<Record<string, unknown>>>,
      errorActionConnectors: undefined,
      reloadRuleActionConnectors: jest.fn(),
    });

    render(<RuleActions ruleActions={ruleActions} actionTypeRegistry={actionTypeRegistry} />);

    expect(await screen.findByText('On check intervals')).toBeInTheDocument();
  });
});
