/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';
import type { IToasts } from '@kbn/core/public';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import * as React from 'react';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { RulesList } from './rules_list';
import {
  getDisabledByLicenseRuleTypeFromApi,
  mockedRulesData,
  ruleType,
  ruleTypeFromApi,
} from './test_helper';
import { loadRuleAggregationsWithKueryFilter as loadRuleAggregationsWithKueryFilterFn } from '../../../lib/rule_api/aggregate_kuery_filter';
import { getRuleTypes as getRuleTypesFn } from '@kbn/response-ops-rules-apis/apis/get_rule_types';
import { bulkDeleteRules as bulkDeleteRulesFn } from '../../../lib/rule_api/bulk_delete';
import { loadRulesWithKueryFilter as loadRulesWithKueryFilterFn } from '../../../lib/rule_api/rules_kuery_filter';
import {
  loadActionTypes as loadActionTypesFn,
  loadAllActions as loadAllActionsFn,
} from '../../../lib/action_connector_api';

vi.mock('../../../../common/lib/kibana');
vi.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => {
  const mocked = {
    useUiSetting: vi.fn(() => false),
    useUiSetting$: vi.fn((value: string) => ['0,0']),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/action_connector_api', () => {
  const mocked = {
    loadActionTypes: vi.fn(),
    loadAllActions: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../lib/rule_api/rules_kuery_filter', () => {
  const mocked = {
    loadRulesWithKueryFilter: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/response-ops-rules-apis/apis/get_rule_types', () => {
  const mocked = {
    getRuleTypes: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/aggregate_kuery_filter', () => {
  const mocked = {
    loadRuleAggregationsWithKueryFilter: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/update_api_key', () => {
  const mocked = {
    updateAPIKey: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/aggregate', () => {
  const mocked = {
    loadRuleTags: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/rule_api/bulk_delete', () => {
  const mocked = {
    bulkDeleteRules: vi.fn().mockResolvedValue({ errors: [], total: 10 }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_alerting_framework_health', () => {
  const mocked = {
    fetchAlertingFrameworkHealth: vi.fn(() => ({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../lib/rule_api/aggregate_kuery_filter');
vi.mock('../../../lib/rule_api/rules_kuery_filter');

vi.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_ui_health_status', () => {
  const mocked = {
    fetchUiHealthStatus: vi.fn(() => ({ isRulesAvailable: true })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/response-ops-rule-form/src/common/apis/fetch_ui_config', () => {
  const mocked = {
    fetchUiConfig: vi
      .fn()
      .mockResolvedValue({ minimumScheduleInterval: { value: '1m', enforce: false } }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('react-router-dom', () => {
  const history = {
    push: vi.fn(),
    createHref: vi.fn(({ pathname }: { pathname: string }) => pathname),
  };
  return {
    useHistory: () => history,
    useLocation: () => ({
      pathname: '/triggersActions/rules/',
    }),
  };
});

vi.mock('@kbn/kibana-utils-plugin/public', async () => {
  const originalModule = await vi.importActual('@kbn/kibana-utils-plugin/public');
  return {
    ...originalModule,
    createKbnUrlStateStorage: vi.fn(() => ({
      get: vi.fn(() => null),
      set: vi.fn(() => null),
    })),
  };
});
vi.mock('react-use/lib/useLocalStorage', () => ({ default: vi.fn(() => [null, () => null]) }));
vi.mock('@kbn/cps-utils', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/cps-utils')),
    useRouteBasedCpsPickerAccess: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../lib/capabilities', () => {
  const mocked = {
    hasAllPrivilege: vi.fn(() => true),
    hasSaveRulesCapability: vi.fn(() => true),
    hasShowActionsCapability: vi.fn(() => true),
    hasExecuteActionsCapability: vi.fn(() => true),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../common/get_experimental_features', () => {
  const mocked = {
    getIsExperimentalFeatureEnabled: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/alerts-ui-shared', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/alerts-ui-shared')),
    MaintenanceWindowCallout: vi.fn(() => <></>),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/ebt-tools');

const usePerformanceContextMock = usePerformanceContext as Mock;
usePerformanceContextMock.mockReturnValue({ onPageReady: vi.fn() });

const loadRuleAggregationsWithKueryFilter = loadRuleAggregationsWithKueryFilterFn as Mock;
const getRuleTypes = getRuleTypesFn as Mock;
const bulkDeleteRules = bulkDeleteRulesFn as Mock;

const loadRulesWithKueryFilter = loadRulesWithKueryFilterFn as Mock;
const loadActionTypes = loadActionTypesFn as Mock;
const loadAllActions = loadAllActionsFn as Mock;

const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();

ruleTypeRegistry.list.mockReturnValue([ruleType]);
actionTypeRegistry.list.mockReturnValue([]);

const useKibanaMock = useKibana as Mocked<typeof useKibana>;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const AllTheProviders = ({ children }: { children: any }) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </IntlProvider>
);

const renderWithProviders = (ui: any) => {
  return render(ui, { wrapper: AllTheProviders });
};

describe('Rules list Bulk Delete', () => {
  beforeAll(async () => {
    (getIsExperimentalFeatureEnabled as Mock<(...args: any) => any>).mockImplementation(
      () => false
    );
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 6,
      data: mockedRulesData,
    });
    loadActionTypes.mockResolvedValue([]);
    getRuleTypes.mockResolvedValue([ruleTypeFromApi, getDisabledByLicenseRuleTypeFromApi()]);
    loadAllActions.mockResolvedValue([]);
    loadRuleAggregationsWithKueryFilter.mockResolvedValue({});
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    useKibanaMock().services.notifications.toasts = {
      addSuccess: vi.fn(),
      addError: vi.fn(),
      addDanger: vi.fn(),
      addWarning: vi.fn(),
    } as unknown as IToasts;
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    cleanup();
  });

  beforeEach(async () => {
    renderWithProviders(<RulesList />);
    await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

    fireEvent.click(screen.getByTestId('checkboxSelectRow-1'));
    fireEvent.click(screen.getByTestId('selectAllRulesButton'));
    fireEvent.click(screen.getByTestId('checkboxSelectRow-2'));
    fireEvent.click(screen.getByTestId('showBulkActionButton'));
  });

  it('should Bulk Delete', async () => {
    fireEvent.click(screen.getByTestId('bulkDelete'));
    expect(screen.getByTestId('rulesDeleteConfirmation')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    });

    const filter = bulkDeleteRules.mock.calls[0][0].filter;

    expect(filter.function).toEqual('and');
    expect(filter.arguments[0].function).toEqual('or');
    expect(filter.arguments[1].function).toEqual('not');
    expect(filter.arguments[1].arguments[0].arguments[0].value).toEqual('alert.id');
    expect(filter.arguments[1].arguments[0].arguments[1].value).toEqual('alert:2');

    expect(bulkDeleteRules).toHaveBeenCalledWith(
      expect.not.objectContaining({
        ids: [],
      })
    );
  });

  it('should cancel Bulk Delete', async () => {
    fireEvent.click(screen.getByTestId('bulkDelete'));
    expect(screen.getByTestId('rulesDeleteConfirmation')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirmModalCancelButton'));
    });
    expect(bulkDeleteRules).not.toHaveBeenCalled();
  });

  it('should have warning toast message after Bulk Delete', async () => {
    bulkDeleteRules.mockResolvedValue({
      errors: [
        {
          message: 'string',
          rule: {
            id: 'string',
            name: 'string',
          },
        },
      ],
      total: 10,
    });

    fireEvent.click(screen.getByTestId('bulkDelete'));
    expect(screen.getByTestId('rulesDeleteConfirmation')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    });

    expect(useKibanaMock().services.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
    expect(useKibanaMock().services.notifications.toasts.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Deleted 9 rules, 1 rule encountered errors',
      })
    );
  });

  it('should have danger toast message after Bulk Delete', async () => {
    bulkDeleteRules.mockResolvedValue({
      errors: [
        {
          message: 'string',
          rule: {
            id: 'string',
            name: 'string',
          },
        },
      ],
      total: 1,
    });

    fireEvent.click(screen.getByTestId('bulkDelete'));
    expect(screen.getByTestId('rulesDeleteConfirmation')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    });

    expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Failed to delete 1 rule',
      })
    );
  });
});
