/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleDetails } from './rule_details';
import type { Rule, ActionType, RuleTypeModel, RuleType } from '../../../../types';
import type { ActionGroup } from '@kbn/alerting-plugin/common';
import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
  ALERTING_FEATURE_ID,
} from '@kbn/alerting-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { createMockConnectorType } from '@kbn/actions-plugin/server/application/connector/mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
      staleTime: 0,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

jest.mock('../../../../common/lib/kibana');

jest.requireMock('../../../../common/get_experimental_features');

jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../lib/rule_api/rule_summary', () => ({
  loadRuleSummary: jest.fn().mockReturnValue({
    alerts: {},
  }),
}));

jest.mock('../../../lib/rule_api/load_execution_log_aggregations', () => ({
  loadExecutionLogAggregations: jest.fn().mockReturnValue([]),
}));

jest.mock('@kbn/response-ops-rules-apis/apis/get_rule_types', () => ({
  getRuleTypes: jest.fn(),
}));

jest.mock('@kbn/response-ops-rules-apis/apis/get_rule_types', () => ({
  getRuleTypes: jest.fn().mockResolvedValue([]),
}));

jest.mock('@kbn/response-ops-rule-form/src/common/apis/fetch_ui_config', () => ({
  fetchUiConfig: jest
    .fn()
    .mockResolvedValue({ minimumScheduleInterval: { value: '1m', enforce: false } }),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    createHref: jest.fn(({ pathname, search = '', hash = '' }) => `${pathname}${search}${hash}`),
    listen: jest.fn(() => jest.fn()),
    location: {
      pathname: '/triggersActions/rules/',
      search: '',
      hash: '',
      state: undefined,
    },
  }),
  useLocation: () => ({
    pathname: '/triggersActions/rules/',
    search: '',
    hash: '',
  }),
}));

jest.mock('../../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../lib/rule_api/update_api_key', () => ({
  bulkUpdateAPIKey: jest.fn(),
}));

jest.mock('./rule_route', () => ({
  RuleRouteWithApi: () => <div data-test-subj="ruleRouteWithApi" />,
}));

const { bulkUpdateAPIKey } = jest.requireMock('../../../lib/rule_api/update_api_key');

jest.mock('../../../lib/capabilities', () => ({
  hasAllPrivilege: jest.fn(() => true),
  hasSaveRulesCapability: jest.fn(() => true),
  hasExecuteActionsCapability: jest.fn(() => true),
  hasManageApiKeysCapability: jest.fn(() => true),
  hasShowActionsCapability: jest.fn(() => false),
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const ruleTypeRegistry = ruleTypeRegistryMock.create();

const mockRuleApis = {
  muteRule: jest.fn(),
  unmuteRule: jest.fn(),
  requestRefresh: jest.fn(),
  refreshToken: { resolve: jest.fn(), reject: jest.fn() },
  snoozeRule: jest.fn(),
  unsnoozeRule: jest.fn(),
  bulkEnableRules: jest.fn(),
  bulkDisableRules: jest.fn(),
  bulkDeleteRules: jest.fn(),
};

const authorizedConsumers = {
  [ALERTING_FEATURE_ID]: { read: true, all: true },
};
const recoveryActionGroup: ActionGroup<'recovered'> = { id: 'recovered', name: 'Recovered' };

const ruleType: RuleType = {
  id: '.noop',
  name: 'No Op',
  actionGroups: [{ id: 'default', name: 'Default' }],
  recoveryActionGroup,
  actionVariables: { context: [], state: [], params: [] },
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  producer: ALERTING_FEATURE_ID,
  authorizedConsumers,
  enabledInLicense: true,
  category: 'my-category',
  isExportable: true,
  isInternallyManaged: false,
};

describe('rule_details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Lifecycle alerts', () => {
    const renderComponent = ({ autoRecoverAlerts }: { autoRecoverAlerts?: boolean }) => {
      const rule = mockRule();
      const requestRefresh = jest.fn();
      return render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails
              rule={rule}
              ruleType={{ ...ruleType, autoRecoverAlerts }}
              actionTypes={[]}
              {...mockRuleApis}
              requestRefresh={requestRefresh}
            />
          </IntlProvider>
        </QueryClientProvider>
      );
    };

    it('shows untrack active alerts modal if `autoRecoverAlerts` is `true`', async () => {
      renderComponent({ autoRecoverAlerts: true });

      await userEvent.click(screen.getByTestId('ruleActionsButton'));
      await waitForEuiPopoverOpen();
      await userEvent.click(screen.getByTestId('disableButton'));

      expect(await screen.findByTestId('untrackAlertsModal')).toBeInTheDocument();
      expect(mockRuleApis.bulkDisableRules).not.toHaveBeenCalled();

      await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      await waitFor(() => {
        expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledTimes(1);
      });
      expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledWith(
        expect.objectContaining({ untrack: false })
      );
    });

    it('shows untrack active alerts modal if `autoRecoverAlerts` is `undefined`', async () => {
      renderComponent({ autoRecoverAlerts: undefined });

      await userEvent.click(screen.getByTestId('ruleActionsButton'));
      await waitForEuiPopoverOpen();
      await userEvent.click(screen.getByTestId('disableButton'));

      expect(await screen.findByTestId('untrackAlertsModal')).toBeInTheDocument();
      expect(mockRuleApis.bulkDisableRules).not.toHaveBeenCalled();

      await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      await waitFor(() => {
        expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledTimes(1);
      });
      expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledWith(
        expect.objectContaining({ untrack: false })
      );
    });

    it('does not show untrack active alerts modal if `autoRecoverAlerts` is `false`', async () => {
      renderComponent({ autoRecoverAlerts: false });

      await userEvent.click(screen.getByTestId('ruleActionsButton'));
      await waitForEuiPopoverOpen();
      await userEvent.click(screen.getByTestId('disableButton'));

      await waitFor(() => {
        expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledTimes(1);
      });
      expect(screen.queryByTestId('untrackAlertsModal')).not.toBeInTheDocument();
      expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledWith(
        expect.objectContaining({ untrack: false })
      );
    });
  });

  describe('page', () => {
    const renderPage = (rule: Rule, overrideRuleType: RuleType = ruleType) =>
      render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails
              rule={rule}
              ruleType={overrideRuleType}
              actionTypes={[]}
              {...mockRuleApis}
            />
          </IntlProvider>
        </QueryClientProvider>
      );

    it('renders the rule name as a title', () => {
      const rule = mockRule();
      renderPage(rule);
      expect(screen.getByText(rule.name)).toBeInTheDocument();
    });

    it('renders the rule execution status badge', () => {
      const rule = mockRule({
        executionStatus: {
          status: 'active',
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        },
      });
      renderPage(rule);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders the API key owner badge when user can manage API keys', () => {
      const rule = mockRule({ apiKeyOwner: 'elastic' });
      renderPage(rule);
      expect(screen.getByTestId('apiKeyOwnerLabel')).toHaveTextContent('elastic');
    });

    it('renders the user-managed icon when apiKeyCreatedByUser is true', async () => {
      const rule = mockRule({ apiKeyOwner: 'elastic', apiKeyCreatedByUser: true });
      renderPage(rule);
      expect(screen.getByTestId('apiKeyOwnerLabel')).toHaveTextContent('elastic');
    });

    it(`doesn't render the API key owner badge when user can't manage API keys`, () => {
      const { hasManageApiKeysCapability } = jest.requireMock('../../../lib/capabilities');
      hasManageApiKeysCapability.mockReturnValueOnce(false);
      const rule = mockRule();
      renderPage(rule);
      expect(screen.queryByTestId('apiKeyOwnerLabel')).not.toBeInTheDocument();
    });

    it('does not render actions button if the user has only read permissions', async () => {
      const { hasAllPrivilege } = jest.requireMock('../../../lib/capabilities');
      hasAllPrivilege.mockReturnValueOnce(false);
      const rule = mockRule();
      const mockedRuleType: RuleType = {
        id: '.noop',
        name: 'No Op',
        actionGroups: [{ id: 'default', name: 'Default' }],
        recoveryActionGroup,
        actionVariables: { context: [], state: [], params: [] },
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        producer: ALERTING_FEATURE_ID,
        authorizedConsumers: {
          [ALERTING_FEATURE_ID]: { read: true, all: false },
        },
        enabledInLicense: true,
        category: 'my-category',
        isExportable: true,
        isInternallyManaged: false,
      };

      renderPage(rule, mockedRuleType);

      expect(screen.queryByTestId('ruleActionsButton')).not.toBeInTheDocument();
    });

    it('renders the rule error banner with error message, when rule has a license error', () => {
      const rule = mockRule({
        enabled: true,
        executionStatus: {
          status: 'error',
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: {
            reason: RuleExecutionStatusErrorReasons.License,
            message: 'test',
          },
        },
      });
      renderPage(rule);
      const ruleErrorBanner = screen.getByTestId('ruleErrorBanner');
      expect(ruleErrorBanner).toBeInTheDocument();
      expect(ruleErrorBanner).toHaveTextContent('Cannot run rule');
      expect(ruleErrorBanner).toHaveTextContent('test');
      expect(screen.getByRole('link', { name: /manage license/i })).toBeInTheDocument();
    });

    it('renders the rule warning banner with warning message, when rule status is a warning', () => {
      const rule = mockRule({
        enabled: true,
        executionStatus: {
          status: 'warning',
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          warning: {
            reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
            message: 'warning message',
          },
        },
      });
      renderPage(rule);
      const ruleWarningBanner = screen.getByTestId('ruleWarningBanner');
      expect(ruleWarningBanner).toBeInTheDocument();
      expect(ruleWarningBanner).toHaveTextContent('warning message');
    });

    it('renders a rule with one action', async () => {
      const rule = mockRule({
        actions: [
          {
            group: 'default',
            id: uuidv4(),
            params: {},
            actionTypeId: '.server-log',
          },
        ],
      });
      renderPage(rule);
      expect(screen.getByTestId('ruleDetailsTitle')).toBeInTheDocument();
      expect(screen.getByText(rule.name)).toBeInTheDocument();
    });

    it('renders a rule with multiple actions', async () => {
      const rule = mockRule({
        actions: [
          {
            group: 'default',
            id: uuidv4(),
            params: {},
            actionTypeId: '.server-log',
          },
          {
            group: 'default',
            id: uuidv4(),
            params: {},
            actionTypeId: '.email',
          },
        ],
      });
      renderPage(rule);
      expect(screen.getByTestId('ruleDetailsTitle')).toBeInTheDocument();
      expect(screen.getByText(rule.name)).toBeInTheDocument();
    });

    it('displays a toast message when interval is less than configured minimum', async () => {
      const rule = mockRule({
        schedule: {
          interval: '1s',
        },
      });
      render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
          </IntlProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(useKibanaMock().services.notifications.toasts.addInfo).toHaveBeenCalled();
      });
    });

    describe('links', () => {
      it('links to the Edit flyout', async () => {
        const rule = mockRule();
        render(
          <QueryClientProvider client={queryClient}>
            <IntlProvider locale="en">
              <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
            </IntlProvider>
          </QueryClientProvider>
        );

        await userEvent.click(screen.getByTestId('ruleActionsButton'));

        await screen.findByTestId('openEditRuleFlyoutButton');
      });

      it('renders view in Discover button when navigation is available', async () => {
        const alertingMock = useKibanaMock().services.alerting;
        (alertingMock!.getNavigation as jest.Mock).mockResolvedValueOnce('/app/discover#/alert');

        const rule = mockRule();
        render(
          <QueryClientProvider client={queryClient}>
            <IntlProvider locale="en">
              <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
            </IntlProvider>
          </QueryClientProvider>
        );

        expect(await screen.findByTestId('ruleDetails-viewInDiscover')).toBeInTheDocument();
        expect(screen.getByText('View in Discover')).toBeInTheDocument();
      });

      it('renders view linked object button for supported rule types', async () => {
        const mockLocator = {
          getRedirectUrl: jest.fn().mockReturnValue('/app/slos/slo-id-1'),
        };
        useKibanaMock().services.share = {
          url: {
            locators: {
              get: jest.fn().mockReturnValue(mockLocator),
            },
          },
        } as any;

        const rule = mockRule({
          ruleTypeId: 'slo.rules.burnRate',
          params: { sloId: 'slo-id-1' },
        });
        render(
          <QueryClientProvider client={queryClient}>
            <IntlProvider locale="en">
              <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
            </IntlProvider>
          </QueryClientProvider>
        );

        expect(screen.getByTestId('ruleDetails-viewLinkedObject')).toBeInTheDocument();
        expect(screen.getByText('View linked SLO')).toBeInTheDocument();

        delete (useKibanaMock().services as any).share;
      });
    });
  });

  describe('edit button', () => {
    const actionTypes: ActionType[] = [
      createMockConnectorType({
        id: '.server-log',
        name: 'Server log',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
      }),
    ];
    ruleTypeRegistry.has.mockReturnValue(true);
    const ruleTypeR: RuleTypeModel = {
      id: 'my-rule-type',
      iconClass: 'test',
      description: 'Rule when testing',
      documentationUrl: 'https://localhost.local/docs',
      validate: () => {
        return { errors: {} };
      },
      ruleParamsExpression: jest.fn(),
      requiresAppContext: false,
    };
    ruleTypeRegistry.get.mockReturnValue(ruleTypeR);
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

    const renderEditButton = (rule: Rule, actionTypesOverride: ActionType[] = actionTypes) =>
      render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails
              rule={rule}
              ruleType={ruleType}
              actionTypes={actionTypesOverride}
              {...mockRuleApis}
            />
          </IntlProvider>
        </QueryClientProvider>
      );

    it('should render an edit button when rule and actions are editable', async () => {
      const rule = mockRule({
        enabled: true,
        muteAll: false,
        actions: [
          {
            group: 'default',
            id: uuidv4(),
            params: {},
            actionTypeId: '.server-log',
          },
        ],
      });
      renderEditButton(rule);
      await userEvent.click(screen.getByTestId('ruleActionsButton'));

      await screen.findByTestId('openEditRuleFlyoutButton');
    });

    it('should not render an edit button when rule editable but actions arent', async () => {
      const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
      hasExecuteActionsCapability.mockReturnValueOnce(false);
      const rule = mockRule({
        enabled: true,
        muteAll: false,
        actions: [
          {
            group: 'default',
            id: uuidv4(),
            params: {},
            actionTypeId: '.server-log',
          },
        ],
      });
      renderEditButton(rule);
      expect(screen.queryByTestId('ruleActionsButton')).not.toBeInTheDocument();
    });

    it('should render an edit button when rule editable but actions arent when there are no actions on the rule', async () => {
      const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
      hasExecuteActionsCapability.mockReturnValueOnce(false);
      const rule = mockRule({
        enabled: true,
        muteAll: false,
        actions: [],
      });
      renderEditButton(rule);
      await userEvent.click(screen.getByTestId('ruleActionsButton'));

      await screen.findByTestId('openEditRuleFlyoutButton');
    });
  });

  describe('broken connector indicator', () => {
    const actionTypes: ActionType[] = [
      {
        id: '.server-log',
        name: 'Server log',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        isSystemActionType: false,
        isDeprecated: false,
        source: 'stack',
      },
    ];
    ruleTypeRegistry.has.mockReturnValue(true);
    const ruleTypeR: RuleTypeModel = {
      id: 'my-rule-type',
      iconClass: 'test',
      description: 'Rule when testing',
      documentationUrl: 'https://localhost.local/docs',
      validate: () => {
        return { errors: {} };
      },
      ruleParamsExpression: jest.fn(),
      requiresAppContext: false,
    };
    ruleTypeRegistry.get.mockReturnValue(ruleTypeR);
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
    const { loadAllActions } = jest.requireMock('../../../lib/action_connector_api');
    loadAllActions.mockResolvedValue([
      {
        secrets: {},
        isMissingSecrets: false,
        id: 'connector-id-1',
        actionTypeId: '.server-log',
        name: 'Test connector',
        config: {},
        isPreconfigured: false,
        isDeprecated: false,
      },
      {
        secrets: {},
        isMissingSecrets: false,
        id: 'connector-id-2',
        actionTypeId: '.server-log',
        name: 'Test connector 2',
        config: {},
        isPreconfigured: false,
        isDeprecated: false,
      },
    ]);

    it('should not render broken connector indicator or warning if all rule actions connectors exist', async () => {
      const rule = mockRule({
        enabled: true,
        muteAll: false,
        actions: [
          {
            group: 'default',
            id: 'connector-id-1',
            params: {},
            actionTypeId: '.server-log',
          },
          {
            group: 'default',
            id: 'connector-id-2',
            params: {},
            actionTypeId: '.server-log',
          },
        ],
      });
      render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails
              rule={rule}
              ruleType={ruleType}
              actionTypes={actionTypes}
              {...mockRuleApis}
            />
          </IntlProvider>
        </QueryClientProvider>
      );
      await waitFor(() =>
        expect(screen.queryByTestId('actionWithBrokenConnector')).not.toBeInTheDocument()
      );
      expect(
        screen.queryByTestId('actionWithBrokenConnectorWarningBanner')
      ).not.toBeInTheDocument();
    });

    it('should render broken connector indicator and warning if any rule actions connector does not exist', async () => {
      const rule = mockRule({
        enabled: true,
        muteAll: false,
        actions: [
          {
            group: 'default',
            id: 'connector-id-1',
            params: {},
            actionTypeId: '.server-log',
          },
          {
            group: 'default',
            id: 'connector-id-2',
            params: {},
            actionTypeId: '.server-log',
          },
          {
            group: 'default',
            id: 'connector-id-doesnt-exist',
            params: {},
            actionTypeId: '.server-log',
          },
        ],
      });
      render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails
              rule={rule}
              ruleType={ruleType}
              actionTypes={actionTypes}
              {...mockRuleApis}
            />
          </IntlProvider>
        </QueryClientProvider>
      );
      await screen.findByTestId('actionWithBrokenConnectorWarningBanner');
      expect(screen.getByTestId('actionWithBrokenConnectorWarningBannerEdit')).toBeInTheDocument();
    });

    it('should render broken connector indicator and warning with no edit button if any rule actions connector does not exist and user has no edit access', async () => {
      const rule = mockRule({
        enabled: true,
        muteAll: false,
        actions: [
          {
            group: 'default',
            id: 'connector-id-1',
            params: {},
            actionTypeId: '.server-log',
          },
          {
            group: 'default',
            id: 'connector-id-2',
            params: {},
            actionTypeId: '.server-log',
          },
          {
            group: 'default',
            id: 'connector-id-doesnt-exist',
            params: {},
            actionTypeId: '.server-log',
          },
        ],
      });
      const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
      hasExecuteActionsCapability.mockReturnValue(false);
      render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails
              rule={rule}
              ruleType={ruleType}
              actionTypes={actionTypes}
              {...mockRuleApis}
            />
          </IntlProvider>
        </QueryClientProvider>
      );
      await screen.findByTestId('actionWithBrokenConnectorWarningBanner');
      expect(
        screen.queryByTestId('actionWithBrokenConnectorWarningBannerEdit')
      ).not.toBeInTheDocument();
    });
  });

  describe('update API key button', () => {
    it('should call update api key when clicked', async () => {
      const rule = mockRule();
      const requestRefresh = jest.fn();
      render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails
              rule={rule}
              ruleType={ruleType}
              actionTypes={[]}
              {...mockRuleApis}
              requestRefresh={requestRefresh}
            />
          </IntlProvider>
        </QueryClientProvider>
      );

      await userEvent.click(screen.getByTestId('ruleActionsButton'));

      await screen.findByTestId('updateAPIKeyButton');

      await userEvent.click(screen.getByTestId('updateAPIKeyButton'));

      await screen.findByTestId('updateApiKeyIdsConfirmation');

      await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(bulkUpdateAPIKey).toHaveBeenCalledTimes(1);
      });
      expect(bulkUpdateAPIKey).toHaveBeenCalledWith(expect.objectContaining({ ids: [rule.id] }));
    });
  });

  describe('delete rule button', () => {
    it('should delete the rule when clicked', async () => {
      mockRuleApis.bulkDeleteRules.mockResolvedValueOnce({
        rules: [{ id: 1 }],
        errors: [],
        total: 1,
      });
      const rule = mockRule();
      const requestRefresh = jest.fn();
      render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails
              rule={rule}
              ruleType={ruleType}
              actionTypes={[]}
              {...mockRuleApis}
              requestRefresh={requestRefresh}
            />
          </IntlProvider>
        </QueryClientProvider>
      );

      await userEvent.click(screen.getByTestId('ruleActionsButton'));

      await screen.findByTestId('deleteRuleButton');

      await userEvent.click(screen.getByTestId('deleteRuleButton'));

      await screen.findByTestId('rulesDeleteConfirmation');

      await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(mockRuleApis.bulkDeleteRules).toHaveBeenCalledTimes(1);
      });
      expect(mockRuleApis.bulkDeleteRules).toHaveBeenCalledWith({ ids: [rule.id] });
    });
  });

  describe('enable/disable rule button', () => {
    it('should disable the rule when clicked', async () => {
      const rule = mockRule();
      const requestRefresh = jest.fn();
      render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails
              rule={rule}
              ruleType={ruleType}
              actionTypes={[]}
              {...mockRuleApis}
              requestRefresh={requestRefresh}
            />
          </IntlProvider>
        </QueryClientProvider>
      );

      await userEvent.click(screen.getByTestId('ruleActionsButton'));

      await screen.findByTestId('disableButton');

      await userEvent.click(screen.getByTestId('disableButton'));

      await screen.findByTestId('untrackAlertsModal');

      await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledTimes(1);
      });
      expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledWith({
        ids: [rule.id],
        untrack: false,
      });
    });

    it('should enable the rule when clicked', async () => {
      const rule = { ...mockRule(), enabled: false };
      const requestRefresh = jest.fn();
      render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails
              rule={rule}
              ruleType={ruleType}
              actionTypes={[]}
              {...mockRuleApis}
              requestRefresh={requestRefresh}
            />
          </IntlProvider>
        </QueryClientProvider>
      );

      await userEvent.click(screen.getByTestId('ruleActionsButton'));

      await screen.findByTestId('disableButton');

      await userEvent.click(screen.getByTestId('disableButton'));

      await waitFor(() => {
        expect(mockRuleApis.bulkEnableRules).toHaveBeenCalledTimes(1);
      });
      expect(mockRuleApis.bulkEnableRules).toHaveBeenCalledWith({ ids: [rule.id] });
    });

    it('should not show untrack alerts modal if rule type does not track alerts life cycle', async () => {
      const rule = mockRule();
      const requestRefresh = jest.fn();
      render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails
              rule={rule}
              ruleType={{ ...ruleType, autoRecoverAlerts: false }}
              actionTypes={[]}
              {...mockRuleApis}
              requestRefresh={requestRefresh}
            />
          </IntlProvider>
        </QueryClientProvider>
      );

      await userEvent.click(screen.getByTestId('ruleActionsButton'));

      await screen.findByTestId('disableButton');

      await userEvent.click(screen.getByTestId('disableButton'));

      expect(screen.queryByTestId('untrackAlertsModal')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledTimes(1);
      });
      expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledWith({
        ids: [rule.id],
        untrack: false,
      });
    });
  });

  function mockRule(overloads: Partial<Rule> = {}): Rule {
    return {
      id: uuidv4(),
      enabled: true,
      name: `rule-${uuidv4()}`,
      tags: [],
      ruleTypeId: '.noop',
      consumer: ALERTING_FEATURE_ID,
      schedule: { interval: '1m' },
      actions: [],
      params: {},
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      apiKeyOwner: null,
      throttle: null,
      notifyWhen: null,
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'unknown',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
      revision: 0,
      apiKeyCreatedByUser: false,
      ...overloads,
    };
  }
});
