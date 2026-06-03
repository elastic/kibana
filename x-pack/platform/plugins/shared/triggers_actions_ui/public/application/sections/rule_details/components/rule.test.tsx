/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BehaviorSubject } from 'rxjs';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { Capabilities } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { RuleComponent, alertToListItem } from './rule';
import type { RuleSummary, AlertStatus, RuleType, RuleTypeModel } from '../../../../types';
import type { AlertStatusValues } from '@kbn/alerting-plugin/common';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { RULE_DETAILS_FILTER_CONTROLS } from '../../alerts_search_bar/constants';
import { mockRule, mockLogResponse } from './test_helpers';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { useKibana } from '../../../../common/lib/kibana';
import { useBulkGetMaintenanceWindowsQuery } from '@kbn/response-ops-alerts-table/hooks/use_bulk_get_maintenance_windows';
import { getMaintenanceWindowsMock } from '@kbn/response-ops-alerts-table/mocks/maintenance_windows.mock';
import { getRuleTypes } from '@kbn/response-ops-rules-apis/apis/get_rule_types';

jest.mock('@kbn/response-ops-rules-apis/apis/get_rule_types');
jest.mocked(getRuleTypes).mockResolvedValue([]);

const mockUseKibanaReturnValue = createStartServicesMock();
jest.mock('../../../../common/lib/kibana', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
  useSpacesData: jest.fn(() => ({
    spaces: [],
    spacesMap: new Map(),
    isLoading: false,
    activeSpaceId: 'default',
  })),
}));
jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));
jest.mock('@kbn/response-ops-alerts-table/hooks/use_bulk_get_maintenance_windows');
jest.mock('../../../lib/rule_api/load_execution_log_aggregations', () => ({
  loadExecutionLogAggregations: jest.fn(),
}));

jest.mock('../../../hooks/use_multiple_spaces', () => ({
  useMultipleSpaces: jest.fn(() => ({
    onShowAllSpacesChange: jest.fn(),
    canAccessMultipleSpaces: false,
    namespaces: undefined,
    activeSpace: undefined,
  })),
}));

const mockAlertSummaryWidget = jest.fn((_props: Record<string, unknown>) => (
  <div data-test-subj="alertSummaryWidget" />
));
jest.mock('../../alert_summary_widget', () => ({
  AlertSummaryWidget: (props: Record<string, unknown>) => mockAlertSummaryWidget(props),
}));

jest.mock('@kbn/kibana-utils-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-utils-plugin/public'),
  setStateToKbnUrl: jest.fn(() => '/mocked-path'),
}));

const mockAlertsTable = jest.fn(() => {
  return <div data-test-subj="alertsTable" />;
});
jest.mock('@kbn/response-ops-alerts-table/components/alerts_table', () => ({
  __esModule: true,
  AlertsTable: mockAlertsTable,
  default: mockAlertsTable,
}));

const { loadExecutionLogAggregations } = jest.requireMock(
  '../../../lib/rule_api/load_execution_log_aggregations'
);

const mocks = coreMock.createSetup();

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

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const useBulkGetMaintenanceWindowsMock = useBulkGetMaintenanceWindowsQuery as jest.Mock;
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const solutionNavId$ = new BehaviorSubject<string | null>(null);

import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';

const fakeNow = new Date('2020-02-09T23:15:41.941Z');
const fake2MinutesAgo = new Date('2020-02-09T23:13:41.941Z');

const mockAPIs = {
  muteAlertInstance: jest.fn(),
  unmuteAlertInstance: jest.fn(),
  requestRefresh: jest.fn(),
  numberOfExecutions: 60,
  onChangeDuration: jest.fn(),
};

let capabilities: Capabilities;
const maintenanceWindowsMap = getMaintenanceWindowsMock();

beforeAll(async () => {
  jest.clearAllMocks();
  ruleTypeRegistry.get.mockReturnValue(ruleTypeR);
  useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
  useKibanaMock().services.chrome.getActiveSolutionNavId$ = jest
    .fn()
    .mockReturnValue(solutionNavId$);

  const services = await mocks.getStartServices();
  capabilities = services[0].application.capabilities;

  global.Date.now = jest.fn(() => fakeNow.getTime());
});

beforeEach(() => {
  (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
  useKibanaMock().services.application.capabilities = {
    ...capabilities,
    maintenanceWindow: {
      show: true,
    },
  };
  useBulkGetMaintenanceWindowsMock.mockReturnValue({
    data: maintenanceWindowsMap,
    isFetching: false,
  });
  loadExecutionLogAggregations.mockResolvedValue(mockLogResponse);
});

afterEach(() => {
  jest.clearAllMocks();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const renderWithProviders = (ui: React.ReactElement, initialEntries?: string[]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <IntlProvider locale="en" messages={{}}>
        <Suspense fallback={null}>
          <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
        </Suspense>
      </IntlProvider>
    </MemoryRouter>
  );
};

describe('rules', () => {
  it('render a list of rules', async () => {
    const rule = mockRule();
    const ruleType = mockRuleType({
      hasAlertsMappings: true,
    });
    const ruleSummary = mockRuleSummary({
      alerts: {
        first_rule: {
          status: 'OK',
          muted: false,
          actionGroupId: 'default',
          flapping: false,
          tracked: true,
        },
        second_rule: {
          status: 'Active',
          muted: false,
          actionGroupId: 'action group id unknown',
          flapping: false,
          tracked: true,
        },
      },
    });

    renderWithProviders(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />
    );

    expect(await screen.findByTestId('ruleStatusPanel')).toBeInTheDocument();
    expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();

    expect(mockAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'rule-detail-alerts-table',
        ruleTypeIds: [ruleType.id],
        showAlertStatusWithFlapping: true,
        query: expect.any(Object),
      }),
      expect.anything()
    );
  });

  it('render a hidden field with duration epoch', () => {
    const rule = mockRule();
    const ruleType = mockRuleType();
    const ruleSummary = mockRuleSummary();

    renderWithProviders(
      <RuleComponent
        durationEpoch={fake2MinutesAgo.getTime()}
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        readOnly={false}
        ruleSummary={ruleSummary}
      />
    );

    const hiddenInput = screen.getByTestId('alertsDurationEpoch') as HTMLInputElement;
    expect(hiddenInput.value).toEqual(fake2MinutesAgo.getTime().toString());
  });

  it('render all active rules', async () => {
    const rule = mockRule();
    const ruleType = mockRuleType({
      hasAlertsMappings: true,
    });
    const alerts: Record<string, AlertStatus> = {
      ['us-central']: {
        status: 'OK',
        muted: false,
        flapping: false,
        tracked: true,
      },
      ['us-east']: {
        status: 'OK',
        muted: false,
        flapping: false,
        tracked: true,
      },
    };

    renderWithProviders(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        readOnly={false}
        ruleSummary={mockRuleSummary({
          alerts,
        })}
      />
    );

    expect(await screen.findByTestId('ruleStatusPanel')).toBeInTheDocument();
    expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();

    expect(mockAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'rule-detail-alerts-table',
        ruleTypeIds: [ruleType.id],
        showAlertStatusWithFlapping: true,
        query: expect.any(Object),
      }),
      expect.anything()
    );
  });

  it('render all inactive rules', async () => {
    const rule = mockRule({
      mutedInstanceIds: ['us-west', 'us-east'],
    });
    const ruleType = mockRuleType({
      hasAlertsMappings: true,
    });
    const alerts: Record<string, AlertStatus> = {
      'us-west': {
        status: 'OK' as AlertStatusValues,
        muted: false,
        flapping: false,
        tracked: true,
      },
      'us-east': {
        status: 'OK' as AlertStatusValues,
        muted: false,
        flapping: false,
        tracked: true,
      },
    };

    renderWithProviders(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        readOnly={false}
        ruleSummary={mockRuleSummary({
          alerts,
        })}
      />
    );

    expect(await screen.findByTestId('ruleStatusPanel')).toBeInTheDocument();
    expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();

    expect(mockAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'rule-detail-alerts-table',
        ruleTypeIds: [ruleType.id],
        showAlertStatusWithFlapping: true,
        query: expect.any(Object),
      }),
      expect.anything()
    );
  });

  it('requests a table refresh when the refresh token changes', async () => {
    jest.useFakeTimers();
    const rule = mockRule({
      enabled: false,
    });
    const ruleType = mockRuleType({
      hasAlertsMappings: true,
    });
    const ruleSummary = mockRuleSummary();
    jest.setSystemTime(fake2MinutesAgo);

    const { rerender } = renderWithProviders(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />
    );

    expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();

    jest.setSystemTime(fakeNow);

    rerender(
      <MemoryRouter>
        <IntlProvider locale="en" messages={{}}>
          <Suspense fallback={null}>
            <QueryClientProvider client={queryClient}>
              <RuleComponent
                {...mockAPIs}
                rule={rule}
                ruleType={ruleType}
                ruleSummary={ruleSummary}
                readOnly={false}
                refreshToken={{
                  resolve: () => undefined,
                  reject: () => undefined,
                }}
              />
            </QueryClientProvider>
          </Suspense>
        </IntlProvider>
      </MemoryRouter>
    );

    expect(mockAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        lastReloadRequestTime: fakeNow.getTime(),
      }),
      expect.anything()
    );

    jest.useRealTimers();
  });
});

describe('alertToListItem', () => {
  it('handles active rules', () => {
    const start = fake2MinutesAgo;
    const alert: AlertStatus = {
      status: 'Active',
      muted: false,
      activeStartDate: fake2MinutesAgo.toISOString(),
      actionGroupId: 'testing',
      flapping: false,
      tracked: true,
    };

    expect(alertToListItem(fakeNow.getTime(), 'id', alert)).toEqual({
      alert: 'id',
      status: 'Active',
      flapping: false,
      start,
      sortPriority: 0,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: false,
      tracked: true,
    });
  });

  it('handles active rules with no action group id', () => {
    const start = fake2MinutesAgo;
    const alert: AlertStatus = {
      status: 'Active',
      muted: false,
      activeStartDate: fake2MinutesAgo.toISOString(),
      flapping: false,
      tracked: true,
    };

    expect(alertToListItem(fakeNow.getTime(), 'id', alert)).toEqual({
      alert: 'id',
      status: 'Active',
      flapping: false,
      start,
      sortPriority: 0,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: false,
      tracked: true,
    });
  });

  it('handles active muted rules', () => {
    const start = fake2MinutesAgo;
    const alert: AlertStatus = {
      status: 'Active',
      muted: true,
      activeStartDate: fake2MinutesAgo.toISOString(),
      actionGroupId: 'default',
      flapping: false,
      tracked: true,
    };

    expect(alertToListItem(fakeNow.getTime(), 'id', alert)).toEqual({
      alert: 'id',
      status: 'Active',
      flapping: false,
      start,
      sortPriority: 0,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: true,
      tracked: true,
    });
  });

  it('handles active rules with start date', () => {
    const alert: AlertStatus = {
      status: 'Active',
      muted: false,
      actionGroupId: 'default',
      flapping: false,
      tracked: true,
    };

    expect(alertToListItem(fakeNow.getTime(), 'id', alert)).toEqual({
      alert: 'id',
      status: 'Active',
      flapping: false,
      start: undefined,
      duration: 0,
      sortPriority: 0,
      isMuted: false,
      tracked: true,
    });
  });

  it('handles muted inactive rules', () => {
    const alert: AlertStatus = {
      status: 'OK',
      muted: true,
      actionGroupId: 'default',
      flapping: false,
      tracked: true,
    };
    expect(alertToListItem(fakeNow.getTime(), 'id', alert)).toEqual({
      alert: 'id',
      status: 'OK',
      flapping: false,
      start: undefined,
      duration: 0,
      sortPriority: 1,
      isMuted: true,
      tracked: true,
    });
  });
});

describe('execution duration overview', () => {
  it('render last execution status', async () => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);

    const rule = mockRule({
      executionStatus: { status: 'ok', lastExecutionDate: new Date('2020-08-20T19:23:38Z') },
    });
    const ruleType = mockRuleType();
    const ruleSummary = mockRuleSummary();

    renderWithProviders(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        readOnly={false}
        ruleSummary={ruleSummary}
      />
    );

    expect(await screen.findAllByTestId('ruleStatus-ok')).toHaveLength(2);

    const ruleExecutionStatusStats = screen.getAllByTestId('ruleStatus-ok');
    expect(ruleExecutionStatusStats[0]).toBeInTheDocument();
    expect(ruleExecutionStatusStats[0]).toHaveTextContent('Last response');
    expect(ruleExecutionStatusStats[1]).toHaveTextContent('Ok');
  });
});

describe('disable/enable functionality', () => {
  it('should show that the rule is enabled', async () => {
    const rule = mockRule();
    const ruleType = mockRuleType();
    const ruleSummary = mockRuleSummary();

    renderWithProviders(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />
    );

    const actionsElem = await screen.findByTestId('statusDropdown');

    expect(actionsElem).toHaveTextContent('Enabled');
  });

  it('should show that the rule is disabled', async () => {
    const rule = mockRule({
      enabled: false,
    });
    const ruleType = mockRuleType();
    const ruleSummary = mockRuleSummary();

    renderWithProviders(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />
    );

    const actionsElem = await screen.findByTestId('statusDropdown');

    expect(actionsElem).toHaveTextContent('Disabled');
  });
});

describe('tabbed content', () => {
  it('defaults to alerts tab when no tabId is in the URL', async () => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(
      (feature: string) => {
        if (feature === 'rulesDetailLogs') {
          return true;
        }
        return false;
      }
    );

    const rule = mockRule();
    const ruleType = mockRuleType();
    const ruleSummary = mockRuleSummary();

    renderWithProviders(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />,
      ['/rule/123']
    );

    const alertListTab = await screen.findByRole('tab', { name: /alerts/i });
    expect(alertListTab).toHaveAttribute('aria-selected', 'true');
  });

  it('defaults to history tab when tabId=history is in the URL', async () => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(
      (feature: string) => {
        if (feature === 'rulesDetailLogs') {
          return true;
        }
        return false;
      }
    );

    const rule = mockRule();
    const ruleType = mockRuleType();
    const ruleSummary = mockRuleSummary();

    renderWithProviders(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />,
      ['/rule/123?tabId=history']
    );

    const historyTab = await screen.findByRole('tab', { name: /history/i });
    expect(historyTab).toHaveAttribute('aria-selected', 'true');
  });

  it('tabbed content renders when the event log experiment is on', async () => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(
      (feature: string) => {
        if (feature === 'rulesDetailLogs') {
          return true;
        }
        return false;
      }
    );

    const rule = mockRule();
    const ruleType = mockRuleType();
    const ruleSummary = mockRuleSummary({
      alerts: {
        first_rule: {
          status: 'OK',
          muted: false,
          actionGroupId: 'default',
          flapping: false,
          tracked: true,
        },
        second_rule: {
          status: 'Active',
          muted: false,
          actionGroupId: 'action group id unknown',
          flapping: false,
          tracked: true,
        },
      },
    });

    renderWithProviders(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />
    );

    expect(await screen.findByRole('tablist')).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: /alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();

    const eventLogTab = await screen.findByRole('tab', { name: /history/i });
    await userEvent.click(eventLogTab);

    expect(eventLogTab).toHaveAttribute('aria-selected', 'true');

    const alertListTab = await screen.findByRole('tab', { name: /alerts/i });
    await userEvent.click(alertListTab);

    expect(alertListTab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('cases ownership based on solution context', () => {
  const renderWithSolution = async (navId: string | null) => {
    solutionNavId$.next(navId);

    const rule = mockRule();
    const ruleType = mockRuleType({ hasAlertsMappings: true });
    const ruleSummary = mockRuleSummary();

    renderWithProviders(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />
    );

    await screen.findByTestId('alertsTable');
  };

  afterEach(() => {
    solutionNavId$.next(null);
  });

  it('sets cases owner to "observability" when solution is oblt', async () => {
    await renderWithSolution('oblt');
    expect(mockAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        casesConfiguration: expect.objectContaining({ owner: ['observability'] }),
      }),
      expect.anything()
    );
  });

  it('sets cases owner to "securitySolution" when solution is security', async () => {
    await renderWithSolution('security');
    expect(mockAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        casesConfiguration: expect.objectContaining({ owner: ['securitySolution'] }),
      }),
      expect.anything()
    );
  });

  it('sets cases owner to "cases" when solution is es (search)', async () => {
    await renderWithSolution('es');
    expect(mockAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        casesConfiguration: expect.objectContaining({ owner: ['cases'] }),
      }),
      expect.anything()
    );
  });

  it('sets cases owner to "cases" when no solution is active (classic)', async () => {
    await renderWithSolution(null);
    expect(mockAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        casesConfiguration: expect.objectContaining({ owner: ['cases'] }),
      }),
      expect.anything()
    );
  });
});

describe('scrollAlertsIntoView', () => {
  it('uses RULE_DETAILS_FILTER_CONTROLS for controlConfigs written to the URL', async () => {
    const rule = mockRule();
    const ruleType = mockRuleType({ hasAlertsMappings: true });
    const ruleSummary = mockRuleSummary();

    renderWithProviders(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />
    );

    await screen.findByTestId('alertSummaryWidget');
    Element.prototype.scrollIntoView = jest.fn();

    const { onClick } = mockAlertSummaryWidget.mock.calls[0][0] as unknown as {
      onClick: (status?: string) => void;
    };
    onClick('active');

    const { controlConfigs } = (setStateToKbnUrl as jest.Mock).mock.calls[0][1] as {
      controlConfigs: Array<{ field_name: string }>;
    };
    const controlFields = controlConfigs.map((c) => c.field_name);
    const expectedFields = RULE_DETAILS_FILTER_CONTROLS.map((c) => c.field_name);
    expect(controlFields).toEqual(expectedFields);
  });
});

function mockRuleType(overloads: Partial<RuleType> = {}): RuleType {
  return {
    id: 'test.testRuleType',
    name: 'My Test Rule Type',
    actionGroups: [{ id: 'default', name: 'Default Action Group' }],
    actionVariables: {
      context: [],
      state: [],
      params: [],
    },
    defaultActionGroupId: 'default',
    recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
    authorizedConsumers: {},
    producer: 'rules',
    minimumLicenseRequired: 'basic',
    enabledInLicense: true,
    category: 'my-category',
    isExportable: true,
    isInternallyManaged: false,
    ...overloads,
  };
}

function mockRuleSummary(overloads: Partial<RuleSummary> = {}): RuleSummary {
  const summary: RuleSummary = {
    id: 'rule-id',
    name: 'rule-name',
    tags: ['tag-1', 'tag-2'],
    ruleTypeId: 'rule-type-id',
    consumer: 'rule-consumer',
    status: 'OK',
    muteAll: false,
    throttle: '',
    enabled: true,
    errorMessages: [],
    revision: 0,
    statusStartDate: fake2MinutesAgo.toISOString(),
    statusEndDate: fakeNow.toISOString(),
    alerts: {
      foo: {
        status: 'OK',
        muted: false,
        actionGroupId: 'testActionGroup',
        flapping: false,
        tracked: true,
      },
    },
    executionDuration: {
      average: 0,
      valuesWithTimestamp: {},
    },
  };
  return { ...summary, ...overloads };
}
