/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fromKueryExpression } from '@kbn/es-query';
import type { IToasts } from '@kbn/core/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { getIsExperimentalFeatureEnabled } from '../../../common/get_experimental_features';
import { ConnectorRulesList } from './connector_rules_list';
import { useKibana } from '../../../common/lib/kibana';
import type { ActionConnector } from '../../../types';
import { mockedRulesData, ruleTypeFromApi } from '../rules_list/components/test_helper';

vi.mock('../../../common/lib/kibana');
vi.mock('../../lib/rule_api/rules_kuery_filter', () => {
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
vi.mock('../../../common/get_experimental_features', () => {
      const mocked = {
      getIsExperimentalFeatureEnabled: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const { getRuleTypes } = (await vi.importMock('@kbn/response-ops-rules-apis/apis/get_rule_types'));
const { loadRulesWithKueryFilter } = (await vi.importMock('../../lib/rule_api/rules_kuery_filter'));

const getUrlForAppMock = vi.fn();
const addSuccessMock = vi.fn();
const addErrorMock = vi.fn();
const addDangerMock = vi.fn();

const useKibanaMock = useKibana as Mocked<typeof useKibana>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

describe('Connector rules list', () => {
  beforeAll(() => {
    (getIsExperimentalFeatureEnabled as Mock<any, any>).mockImplementation(() => false);
    useKibanaMock().services.application.getUrlForApp = getUrlForAppMock;
    useKibanaMock().services.notifications.toasts = {
      addSuccessMock,
      addErrorMock,
      addDangerMock,
    } as unknown as IToasts;
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 25,
      total: mockedRulesData.length,
      data: mockedRulesData,
    });
    getRuleTypes.mockResolvedValue([ruleTypeFromApi]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConnectorRulesList
            connector={
              {
                id: 'test-id',
                isPreconfigured: false,
                isSystemAction: false,
              } as ActionConnector
            }
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('connectorRulesList')).toBeInTheDocument();
      expect(screen.queryAllByTestId('connectorRuleRow')).toHaveLength(mockedRulesData.length);
    });
  });

  it('should allow for sorting by name', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConnectorRulesList
            connector={
              {
                id: 'test-id',
                isPreconfigured: false,
                isSystemAction: false,
              } as ActionConnector
            }
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.queryAllByTestId('connectorRuleRow')).toHaveLength(mockedRulesData.length);
    });

    const nameColumnTableHeaderEl = await screen.findByTestId('tableHeaderCell_name_0');

    const el = nameColumnTableHeaderEl.querySelector(
      '[data-test-subj="tableHeaderCell_name_0"] .euiTableHeaderButton'
    ) as HTMLElement;

    fireEvent.click(el);

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: { direction: 'desc', field: 'name' },
      })
    );
  });

  it('should allow for searching by text', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConnectorRulesList
            connector={
              {
                id: 'test-id',
                isPreconfigured: false,
                isSystemAction: false,
              } as ActionConnector
            }
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.queryAllByTestId('connectorRuleRow')).toHaveLength(mockedRulesData.length);
    });

    await userEvent.type(screen.getByTestId('connectorRulesListSearch'), 'test{enter}');

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        searchText: 'test',
      })
    );
  });

  it('should find preconfigured rules correctly', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConnectorRulesList
            connector={
              {
                id: 'test-id',
                isPreconfigured: true,
                isSystemAction: false,
              } as ActionConnector
            }
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.queryAllByTestId('connectorRuleRow')).toHaveLength(mockedRulesData.length);
    });

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hasReference: undefined,
        kueryNode: fromKueryExpression(
          `alert.attributes.actions:{ actionRef: "preconfigured:test-id" }`
        ),
      })
    );
  });

  it('should find system actions rules correctly', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConnectorRulesList
            connector={
              {
                id: 'test-id',
                isPreconfigured: false,
                isSystemAction: true,
              } as ActionConnector
            }
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.queryAllByTestId('connectorRuleRow')).toHaveLength(mockedRulesData.length);
    });

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hasReference: undefined,
        kueryNode: fromKueryExpression(
          `alert.attributes.actions:{ actionRef: "system_action:test-id" }`
        ),
      })
    );
  });
});
