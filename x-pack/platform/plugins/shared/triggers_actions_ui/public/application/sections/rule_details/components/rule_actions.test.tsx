/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { screen, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { RuleActions } from './rule_actions';
import type { RuleActionsProps } from './rule_actions';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import type { ActionConnector, ActionTypeModel } from '../../../../types';
import * as useFetchRuleActionConnectorsHook from '../../../hooks/use_fetch_rule_action_connectors';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../../common/lib/kibana');

const actionTypeRegistry = actionTypeRegistryMock.create();

const registeredActionTypes = [
  { id: '.server-log', iconClass: 'logsApp', isSystemActionType: false },
  { id: '.slack', iconClass: 'logoSlack', isSystemActionType: false },
  { id: '.email', iconClass: 'email', isSystemActionType: false },
  { id: '.index', iconClass: 'indexOpen', isSystemActionType: false },
] as ActionTypeModel[];

const registerActionTypes = (models: ActionTypeModel[]) => {
  actionTypeRegistry.has.mockImplementation((id: string) =>
    models.some((model) => model.id === id)
  );
  actionTypeRegistry.get.mockImplementation((id: string) => {
    const model = models.find((candidate) => candidate.id === id);
    if (!model) {
      throw new Error(`Action type "${id}" is not registered`);
    }
    return model;
  });
  actionTypeRegistry.list.mockReturnValue(models);
};

const mockedUseFetchRuleActionConnectorsHook = jest.spyOn(
  useFetchRuleActionConnectorsHook,
  'useFetchRuleActionConnectors'
);

const mockActionConnectors = (connectors: Array<Partial<ActionConnector>>) => {
  mockedUseFetchRuleActionConnectorsHook.mockReturnValue({
    isLoadingActionConnectors: false,
    actionConnectors: connectors as Array<ActionConnector<Record<string, unknown>>>,
    errorActionConnectors: undefined,
    reloadRuleActionConnectors: jest.fn(),
  });
};

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
let httpGetMock: jest.Mock;

const renderRuleActions = (props: Omit<RuleActionsProps, 'actionTypeRegistry'>) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RuleActions {...props} actionTypeRegistry={actionTypeRegistry} />
    </QueryClientProvider>
  );
};

const specWireResponse = {
  metadata: {
    id: '.slack2',
    display_name: 'Slack (v2)',
    description: 'Slack',
    minimum_license: 'gold',
    supported_feature_ids: ['alerting'],
    icon: 'logoSlack',
  },
  schema: {
    type: 'object',
    properties: {
      config: { type: 'object', properties: {} },
      secrets: { type: 'object', properties: {} },
    },
    required: ['config', 'secrets'],
  },
  actions: {
    sendMessage: {
      input: { type: 'object', properties: { channel: { type: 'string' } } },
      scope: 'write',
    },
  },
  alerting: { default_action: 'sendMessage' },
  is_testable: true,
};

describe('Rule Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    registerActionTypes(registeredActionTypes);
    httpGetMock = useKibanaMock().services.http.get as jest.Mock;
    httpGetMock.mockReset();
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

    mockActionConnectors([
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
    ]);

    renderRuleActions({ ruleActions });
    expect(mockedUseFetchRuleActionConnectorsHook).toHaveBeenCalledTimes(1);

    const logsAppIcons = screen.getAllByTestId('ruleActionIcon-logsApp');
    const slackIcons = screen.getAllByTestId('ruleActionIcon-logoSlack');
    const indexIcons = screen.queryAllByTestId('ruleActionIcon-indexOpen');
    const emailIcons = screen.queryAllByTestId('ruleActionIcon-email');

    expect(logsAppIcons).toHaveLength(1);
    expect(slackIcons).toHaveLength(1);
    expect(indexIcons).toHaveLength(0);
    expect(emailIcons).toHaveLength(0);
    expect(httpGetMock).not.toHaveBeenCalled();
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

    mockActionConnectors([
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
    ]);

    renderRuleActions({ ruleActions });

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

    registerActionTypes([
      { id: '.test-system-action', iconClass: 'logsApp', isSystemActionType: true },
    ] as ActionTypeModel[]);

    mockActionConnectors([
      {
        id: 'system-connector-.test-system-action',
        actionTypeId: '.test-system-action',
      },
    ]);

    renderRuleActions({ ruleActions });

    expect(await screen.findByText('On check intervals')).toBeInTheDocument();
  });

  it('renders the spec connector icon for an action type absent from the registry', async () => {
    const ruleActions = [
      {
        id: 'slack2-connector',
        group: 'default',
        actionTypeId: '.slack2',
        params: {},
        frequency: {
          notifyWhen: 'onActionGroupChange' as const,
          throttle: null,
          summary: false,
        },
      },
    ];

    httpGetMock.mockResolvedValue(specWireResponse);
    mockActionConnectors([{ id: 'slack2-connector', name: 'Slack v2', actionTypeId: '.slack2' }]);

    renderRuleActions({ ruleActions });

    expect(screen.getByTestId('actionConnectorName-0-Slack v2')).toBeInTheDocument();
    expect(await screen.findByTestId('ruleActionIcon-logoSlack')).toBeInTheDocument();
    expect(await screen.findByText('On status changes')).toBeInTheDocument();
    expect(httpGetMock).toHaveBeenCalledWith(
      '/internal/actions/connector_types/.slack2/spec',
      expect.anything()
    );
  });

  it('falls back to a generic icon when the action type is unknown and the spec cannot be loaded', async () => {
    const ruleActions = [
      {
        id: 'unknown-connector',
        group: 'default',
        actionTypeId: '.unknown',
        params: {},
        frequency: {
          notifyWhen: 'onActionGroupChange' as const,
          throttle: null,
          summary: false,
        },
      },
    ];

    httpGetMock.mockRejectedValue(new Error('Not Found'));
    mockActionConnectors([{ id: 'unknown-connector', name: 'Unknown', actionTypeId: '.unknown' }]);

    renderRuleActions({ ruleActions });

    expect(screen.getByTestId('actionConnectorName-0-Unknown')).toBeInTheDocument();
    expect(await screen.findByTestId('ruleActionIcon-apps')).toBeInTheDocument();
    expect(await screen.findByText('On status changes')).toBeInTheDocument();
    expect(actionTypeRegistry.get).not.toHaveBeenCalled();
  });
});
