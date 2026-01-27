/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject } from 'rxjs';
import { mountWithIntl, shallowWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleDetails } from './rule_details';
import type {
  Rule,
  ActionType,
  RuleTypeModel,
  GetDescriptionFieldsFn,
  RuleType,
} from '../../../../types';
import { EuiBadge, EuiButtonEmpty, EuiPageHeader, type EuiPageHeaderProps } from '@elastic/eui';
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
  }),
  useLocation: () => ({
    pathname: '/triggersActions/rules/',
  }),
}));

jest.mock('../../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../lib/rule_api/update_api_key', () => ({
  bulkUpdateAPIKey: jest.fn(),
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

      await waitFor(async () => {
        expect(screen.queryByTestId('untrackAlertsModal')).toBeInTheDocument();
        expect(mockRuleApis.bulkDisableRules).not.toHaveBeenCalled();
      });

      await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      await waitFor(async () => {
        expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledTimes(1);
        expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledWith(
          expect.objectContaining({ untrack: false })
        );
      });
    });

    it('shows untrack active alerts modal if `autoRecoverAlerts` is `undefined`', async () => {
      renderComponent({ autoRecoverAlerts: undefined });

      await userEvent.click(screen.getByTestId('ruleActionsButton'));
      await waitForEuiPopoverOpen();
      await userEvent.click(screen.getByTestId('disableButton'));

      await waitFor(async () => {
        expect(screen.queryByTestId('untrackAlertsModal')).toBeInTheDocument();
        expect(mockRuleApis.bulkDisableRules).not.toHaveBeenCalled();
      });

      await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      await waitFor(async () => {
        expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledTimes(1);
        expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledWith(
          expect.objectContaining({ untrack: false })
        );
      });
    });

    it('does not show untrack active alerts modal if `autoRecoverAlerts` is `false`', async () => {
      renderComponent({ autoRecoverAlerts: false });

      await userEvent.click(screen.getByTestId('ruleActionsButton'));
      await waitForEuiPopoverOpen();
      await userEvent.click(screen.getByTestId('disableButton'));

      await waitFor(async () => {
        expect(screen.queryByTestId('untrackAlertsModal')).not.toBeInTheDocument();

        expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledTimes(1);
        expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledWith(
          expect.objectContaining({ untrack: false })
        );
      });
    });
  });

  describe('page', () => {
    it('renders the rule name as a title', () => {
      const rule = mockRule();
      expect(
        shallowWithIntl(
          <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
        ).find(EuiPageHeader)
      ).toBeTruthy();
    });

    it('renders the rule type badge', () => {
      const rule = mockRule();
      expect(
        shallowWithIntl(
          <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
        ).find(<EuiBadge>{ruleType.name}</EuiBadge>)
      ).toBeTruthy();
    });

    it('renders the API key owner badge when user can manage API keys', () => {
      const rule = mockRule({ apiKeyOwner: 'elastic' });
      const wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
        </QueryClientProvider>
      );
      expect(wrapper.find('[data-test-subj="apiKeyOwnerLabel"]').first().text()).toBe('elastic');
    });

    it('renders the user-managed icon when apiKeyCreatedByUser is true', async () => {
      const rule = mockRule({ apiKeyOwner: 'elastic', apiKeyCreatedByUser: true });
      const wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
        </QueryClientProvider>
      );
      expect(wrapper.find('[data-test-subj="apiKeyOwnerLabel"]').first().text()).toBe(
        'elastic Info'
      );
    });

    it(`doesn't render the API key owner badge when user can't manage API keys`, () => {
      const { hasManageApiKeysCapability } = jest.requireMock('../../../lib/capabilities');
      hasManageApiKeysCapability.mockReturnValueOnce(false);
      const rule = mockRule();
      expect(
        shallowWithIntl(
          <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
        )
          .find(<EuiBadge>{rule.apiKeyOwner}</EuiBadge>)
          .exists()
      ).toBeFalsy();
    });

    it('does not render actions button if the user has only read permissions', async () => {
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
          ALERTING_FEATURE_ID: { read: true, all: false },
        },
        enabledInLicense: true,
        category: 'my-category',
        isExportable: true,
        isInternallyManaged: false,
      };

      const wrapper = shallowWithIntl(
        <RuleDetails rule={rule} ruleType={mockedRuleType} actionTypes={[]} {...mockRuleApis} />
      );

      expect(wrapper.find('[data-test-subj="ruleActionsButton"]').exists()).toBeFalsy();
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
      const wrapper = shallowWithIntl(
        <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
      );
      expect(wrapper.find('[data-test-subj="ruleErrorBanner"]').first().shallow())
        .toMatchInlineSnapshot(`
        <EuiPanel
          borderRadius="none"
          color="danger"
          css="unknown styles"
          data-test-subj="ruleErrorBanner"
          grow={false}
          paddingSize="s"
          panelRef={null}
        >
          <p
            className="euiCallOutHeader__title"
          >
            <EuiIcon
              aria-hidden="true"
              color="inherit"
              css="unknown styles"
              size="m"
              type="error"
            />
            Cannot run rule
          </p>
          <EuiSpacer
            size="s"
          />
          <EuiText
            color="default"
            size="xs"
          >
            <EuiText
              size="xs"
            >
              test
            </EuiText>
            <EuiSpacer
              size="s"
            />
            <EuiLink
              color="primary"
              href="/app/management/stack/license_management"
              target="_blank"
            >
              <MemoizedFormattedMessage
                defaultMessage="Manage license"
                id="xpack.triggersActionsUI.sections.ruleDetails.manageLicensePlanBannerLinkTitle"
              />
            </EuiLink>
          </EuiText>
          <EuiLiveAnnouncer>
            Cannot run rule, 
            <EuiText
              size="xs"
            >
              test
            </EuiText>
            <EuiSpacer
              size="s"
            />
            <EuiLink
              color="primary"
              href="/app/management/stack/license_management"
              target="_blank"
            >
              <MemoizedFormattedMessage
                defaultMessage="Manage license"
                id="xpack.triggersActionsUI.sections.ruleDetails.manageLicensePlanBannerLinkTitle"
              />
            </EuiLink>
          </EuiLiveAnnouncer>
        </EuiPanel>
      `);
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
      const wrapper = shallowWithIntl(
        <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
      );
      expect(
        wrapper.find('[data-test-subj="ruleWarningBanner"]').first().text()
      ).toMatchInlineSnapshot(`"<EuiIcon /> Action limit exceeded warning message"`);
    });

    it('displays a toast message when interval is less than configured minimum', async () => {
      const rule = mockRule({
        schedule: {
          interval: '1s',
        },
      });
      const wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
        </QueryClientProvider>
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(useKibanaMock().services.notifications.toasts.addInfo).toHaveBeenCalled();
    });

    describe('actions', () => {
      it('renders an rule action', () => {
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

        const actionTypes: ActionType[] = [
          createMockConnectorType({
            id: '.server-log',
            name: 'Server log',
            minimumLicenseRequired: 'basic',
            supportedFeatureIds: ['alerting'],
          }),
        ];

        const wrapper = mountWithIntl(
          <QueryClientProvider client={queryClient}>
            <RuleDetails
              rule={rule}
              ruleType={ruleType}
              actionTypes={actionTypes}
              {...mockRuleApis}
            />
          </QueryClientProvider>
        );

        expect(
          wrapper.find('[data-test-subj="actionConnectorName-0-Server log"]').exists
        ).toBeTruthy();
      });

      it('renders a counter for multiple rule action', () => {
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
        const actionTypes: ActionType[] = [
          createMockConnectorType({
            id: '.server-log',
            name: 'Server log',
            minimumLicenseRequired: 'basic',
            supportedFeatureIds: ['alerting'],
          }),
          createMockConnectorType({
            id: '.email',
            name: 'Send email',
            minimumLicenseRequired: 'basic',
            supportedFeatureIds: ['alerting'],
          }),
        ];

        const details = mountWithIntl(
          <QueryClientProvider client={queryClient}>
            <RuleDetails
              rule={rule}
              ruleType={ruleType}
              actionTypes={actionTypes}
              {...mockRuleApis}
            />
          </QueryClientProvider>
        );

        expect(
          details.find('[data-test-subj="actionConnectorName-0-Server log"]').exists
        ).toBeTruthy();
        expect(
          details.find('[data-test-subj="actionConnectorName-0-Send email"]').exists
        ).toBeTruthy();
      });
    });

    describe('links', () => {
      it('renders view in app button in management context', () => {
        const rule = mockRule();
        const currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
        useKibanaMock().services.application.currentAppId$ = currentAppId$.asObservable();
        expect(
          shallowWithIntl(
            <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
          ).find('ViewInApp')
        ).toBeTruthy();
      });

      it('renders view linked object button in rules app context', () => {
        const rule = mockRule();
        const currentAppId$ = new BehaviorSubject<string | undefined>('rules');
        useKibanaMock().services.application.currentAppId$ = currentAppId$.asObservable();
        expect(
          shallowWithIntl(
            <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
          ).find('ViewLinkedObject')
        ).toBeTruthy();
      });

      it('links to the Edit flyout', () => {
        const rule = mockRule();
        const pageHeaderProps = shallowWithIntl(
          <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
        )
          .find(EuiPageHeader)
          .props() as EuiPageHeaderProps;
        const rightSideItems = pageHeaderProps.rightSideItems;
        expect(!!rightSideItems && rightSideItems[1]!).toMatchInlineSnapshot(`
          <React.Fragment>
            <EuiButtonEmpty
              aria-label="Edit"
              data-test-subj="openEditRuleFlyoutButton"
              disabled={false}
              iconType="pencil"
              name="edit"
              onClick={[Function]}
            >
              <Memo(MemoizedFormattedMessage)
                defaultMessage="Edit"
                id="xpack.triggersActionsUI.sections.ruleDetails.editRuleButtonLabel"
              />
            </EuiButtonEmpty>
          </React.Fragment>
        `);
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

    it('should render an edit button when rule and actions are editable', () => {
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
      const pageHeaderProps = shallowWithIntl(
        <RuleDetails rule={rule} ruleType={ruleType} actionTypes={actionTypes} {...mockRuleApis} />
      )
        .find(EuiPageHeader)
        .props() as EuiPageHeaderProps;
      const rightSideItems = pageHeaderProps.rightSideItems;
      expect(!!rightSideItems && rightSideItems[1]!).toMatchInlineSnapshot(`
        <React.Fragment>
          <EuiButtonEmpty
            aria-label="Edit"
            data-test-subj="openEditRuleFlyoutButton"
            disabled={false}
            iconType="pencil"
            name="edit"
            onClick={[Function]}
          >
            <Memo(MemoizedFormattedMessage)
              defaultMessage="Edit"
              id="xpack.triggersActionsUI.sections.ruleDetails.editRuleButtonLabel"
            />
          </EuiButtonEmpty>
        </React.Fragment>
      `);
    });

    it('should not render an edit button when rule editable but actions arent', () => {
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
      expect(
        shallowWithIntl(
          <RuleDetails
            rule={rule}
            ruleType={ruleType}
            actionTypes={actionTypes}
            {...mockRuleApis}
          />
        )
          .find(EuiButtonEmpty)
          .find('[name="edit"]')
          .first()
          .exists()
      ).toBeFalsy();
    });

    it('should render an edit button when rule editable but actions arent when there are no actions on the rule', async () => {
      const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
      hasExecuteActionsCapability.mockReturnValueOnce(false);
      const rule = mockRule({
        enabled: true,
        muteAll: false,
        actions: [],
      });
      const pageHeaderProps = shallowWithIntl(
        <RuleDetails rule={rule} ruleType={ruleType} actionTypes={actionTypes} {...mockRuleApis} />
      )
        .find(EuiPageHeader)
        .props() as EuiPageHeaderProps;
      const rightSideItems = pageHeaderProps.rightSideItems;
      expect(!!rightSideItems && rightSideItems[1]!).toMatchInlineSnapshot(`
        <React.Fragment>
          <EuiButtonEmpty
            aria-label="Edit"
            data-test-subj="openEditRuleFlyoutButton"
            disabled={false}
            iconType="pencil"
            name="edit"
            onClick={[Function]}
          >
            <Memo(MemoizedFormattedMessage)
              defaultMessage="Edit"
              id="xpack.triggersActionsUI.sections.ruleDetails.editRuleButtonLabel"
            />
          </EuiButtonEmpty>
        </React.Fragment>
      `);
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
      const wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleDetails
            rule={rule}
            ruleType={ruleType}
            actionTypes={actionTypes}
            {...mockRuleApis}
          />
        </QueryClientProvider>
      );
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
      const brokenConnectorIndicator = wrapper
        .find('[data-test-subj="actionWithBrokenConnector"]')
        .first();
      const brokenConnectorWarningBanner = wrapper
        .find('[data-test-subj="actionWithBrokenConnectorWarningBanner"]')
        .first();
      expect(brokenConnectorIndicator.exists()).toBeFalsy();
      expect(brokenConnectorWarningBanner.exists()).toBeFalsy();
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
      const wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleDetails
            rule={rule}
            ruleType={ruleType}
            actionTypes={actionTypes}
            {...mockRuleApis}
          />
        </QueryClientProvider>
      );
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
      const brokenConnectorWarningBanner = wrapper
        .find('[data-test-subj="actionWithBrokenConnectorWarningBanner"]')
        .first();
      const brokenConnectorWarningBannerAction = wrapper
        .find('[data-test-subj="actionWithBrokenConnectorWarningBannerEdit"]')
        .first();
      expect(brokenConnectorWarningBanner.exists()).toBeTruthy();
      expect(brokenConnectorWarningBannerAction.exists()).toBeTruthy();
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
      const wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleDetails
            rule={rule}
            ruleType={ruleType}
            actionTypes={actionTypes}
            {...mockRuleApis}
          />
        </QueryClientProvider>
      );
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
      const brokenConnectorWarningBanner = wrapper
        .find('[data-test-subj="actionWithBrokenConnectorWarningBanner"]')
        .first();
      const brokenConnectorWarningBannerAction = wrapper
        .find('[data-test-subj="actionWithBrokenConnectorWarningBannerEdit"]')
        .first();
      expect(brokenConnectorWarningBanner.exists()).toBeTruthy();
      expect(brokenConnectorWarningBannerAction.exists()).toBeFalsy();
    });
  });

  describe('refresh button', () => {
    it('should call requestRefresh when clicked', async () => {
      const rule = mockRule();
      const requestRefresh = jest.fn();
      const wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleDetails
            rule={rule}
            ruleType={ruleType}
            actionTypes={[]}
            {...mockRuleApis}
            requestRefresh={requestRefresh}
          />
        </QueryClientProvider>
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      const refreshButton = wrapper.find('[data-test-subj="refreshRulesButton"]').last();
      expect(refreshButton.exists()).toBeTruthy();

      refreshButton.simulate('click');
      expect(requestRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('update API key button', () => {
    it('should call update api key when clicked', async () => {
      const rule = mockRule();
      const requestRefresh = jest.fn();
      const wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleDetails
            rule={rule}
            ruleType={ruleType}
            actionTypes={[]}
            {...mockRuleApis}
            requestRefresh={requestRefresh}
          />
        </QueryClientProvider>
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
      const actionsButton = wrapper.find('[data-test-subj="ruleActionsButton"]').last();
      actionsButton.simulate('click');

      const updateButton = wrapper.find('[data-test-subj="updateAPIKeyButton"]').last();
      expect(updateButton.exists()).toBeTruthy();

      updateButton.simulate('click');

      const confirm = wrapper.find('[data-test-subj="updateApiKeyIdsConfirmation"]').first();
      expect(confirm.exists()).toBeTruthy();

      const confirmButton = wrapper.find('[data-test-subj="confirmModalConfirmButton"]').last();
      expect(confirmButton.exists()).toBeTruthy();

      confirmButton.simulate('click');

      expect(bulkUpdateAPIKey).toHaveBeenCalledTimes(1);
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
      const wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleDetails
            rule={rule}
            ruleType={ruleType}
            actionTypes={[]}
            {...mockRuleApis}
            requestRefresh={requestRefresh}
          />
        </QueryClientProvider>
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
      const actionsButton = wrapper.find('[data-test-subj="ruleActionsButton"]').last();
      actionsButton.simulate('click');

      const updateButton = wrapper.find('[data-test-subj="deleteRuleButton"]').last();
      expect(updateButton.exists()).toBeTruthy();

      updateButton.simulate('click');

      const confirm = wrapper.find('[data-test-subj="rulesDeleteConfirmation"]').first();
      expect(confirm.exists()).toBeTruthy();

      const confirmButton = wrapper.find('[data-test-subj="confirmModalConfirmButton"]').last();
      expect(confirmButton.exists()).toBeTruthy();

      confirmButton.simulate('click');

      expect(mockRuleApis.bulkDeleteRules).toHaveBeenCalledTimes(1);
      expect(mockRuleApis.bulkDeleteRules).toHaveBeenCalledWith({ ids: [rule.id] });
    });
  });

  describe('enable/disable rule button', () => {
    it('should disable the rule when clicked', async () => {
      const rule = mockRule();
      const requestRefresh = jest.fn();
      const wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleDetails
            rule={rule}
            ruleType={ruleType}
            actionTypes={[]}
            {...mockRuleApis}
            requestRefresh={requestRefresh}
          />
        </QueryClientProvider>
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
      const actionsButton = wrapper.find('[data-test-subj="ruleActionsButton"]').last();
      actionsButton.simulate('click');

      const disableButton = wrapper.find('[data-test-subj="disableButton"]').last();
      expect(disableButton.exists()).toBeTruthy();

      disableButton.simulate('click');

      const modal = wrapper.find('[data-test-subj="untrackAlertsModal"]');
      expect(modal.exists()).toBeTruthy();

      modal.find('[data-test-subj="confirmModalConfirmButton"]').last().simulate('click');

      expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledTimes(1);
      expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledWith({
        ids: [rule.id],
        untrack: false,
      });
    });

    it('should enable the rule when clicked', async () => {
      const rule = { ...mockRule(), enabled: false };
      const requestRefresh = jest.fn();
      const wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleDetails
            rule={rule}
            ruleType={ruleType}
            actionTypes={[]}
            {...mockRuleApis}
            requestRefresh={requestRefresh}
          />
        </QueryClientProvider>
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
      const actionsButton = wrapper.find('[data-test-subj="ruleActionsButton"]').last();
      actionsButton.simulate('click');

      const enableButton = wrapper.find('[data-test-subj="disableButton"]').last();
      expect(enableButton.exists()).toBeTruthy();

      enableButton.simulate('click');

      expect(mockRuleApis.bulkEnableRules).toHaveBeenCalledTimes(1);
      expect(mockRuleApis.bulkEnableRules).toHaveBeenCalledWith({ ids: [rule.id] });
    });

    it('should not show untrack alerts modal if rule type does not track alerts life cycle', async () => {
      const rule = mockRule();
      const requestRefresh = jest.fn();
      const wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleDetails
            rule={rule}
            ruleType={{ ...ruleType, autoRecoverAlerts: false }}
            actionTypes={[]}
            {...mockRuleApis}
            requestRefresh={requestRefresh}
          />
        </QueryClientProvider>
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
      const actionsButton = wrapper.find('[data-test-subj="ruleActionsButton"]').last();
      actionsButton.simulate('click');

      const disableButton = wrapper.find('[data-test-subj="disableButton"]').last();
      expect(disableButton.exists()).toBeTruthy();

      disableButton.simulate('click');

      const modal = wrapper.find('[data-test-subj="untrackAlertsModal"]');
      expect(modal.exists()).not.toBeTruthy();

      expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledTimes(1);
      expect(mockRuleApis.bulkDisableRules).toHaveBeenCalledWith({
        ids: [rule.id],
        untrack: false,
      });
    });
  });

  describe('when the rule type includes the getDescriptionFields function in the registry definition', () => {
    const getDescriptionFields: GetDescriptionFieldsFn = ({ rule }) => {
      return [
        {
          title: 'my title',
          description: <div>Generated Test Description Field - {rule.ruleTypeId}</div>,
        },
      ];
    };

    const ruleTypeWithDescriptionFields = {
      ...ruleType,
      id: '.noop-with-description-fields',
      name: 'No Op with description fields',
      getDescriptionFields,
    };

    const ruleTypeWithDescriptionFieldsModel: RuleTypeModel = {
      id: '.noop-with-description-fields',
      iconClass: 'test',
      description: 'Rule when testing',
      documentationUrl: 'https://localhost.local/docs',
      validate: () => {
        return { errors: {} };
      },
      ruleParamsExpression: jest.fn(),
      requiresAppContext: false,
      getDescriptionFields,
    };

    beforeEach(() => {
      jest.clearAllMocks();

      ruleTypeRegistry.has.mockReturnValue(true);
      ruleTypeRegistry.get.mockReturnValue(ruleTypeWithDescriptionFieldsModel);
      useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
    });

    it('should render the description fields', async () => {
      const rule = mockRule({
        ruleTypeId: '.noop-with-description-fields',
      });
      const requestRefresh = jest.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en">
            <RuleDetails
              rule={rule}
              ruleType={ruleTypeWithDescriptionFields}
              actionTypes={[]}
              {...mockRuleApis}
              requestRefresh={requestRefresh}
            />
          </IntlProvider>
        </QueryClientProvider>
      );

      expect(
        await screen.findByText('Generated Test Description Field - .noop-with-description-fields')
      ).toBeInTheDocument();
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
