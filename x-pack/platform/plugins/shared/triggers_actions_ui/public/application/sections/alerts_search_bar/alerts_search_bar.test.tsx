/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAlertsDataView } from '@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AlertsSearchBar } from './alerts_search_bar';

const mockDataPlugin = dataPluginMock.createStartContract();
vi.mock('@kbn/kibana-utils-plugin/public');
vi.mock('@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view');
vi.mock('@kbn/kibana-react-plugin/public', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/kibana-react-plugin/public')),
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mocked(useAlertsDataView).mockReturnValue({
  isLoading: false,
  dataView: {
    title: '.alerts-*',
    fields: [
      {
        name: 'event.action',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
});

const mockUseKibana = useKibana as Mock;

const unifiedSearchBarMock = vi.fn().mockImplementation((props) => (
  <button
    data-test-subj="querySubmitButton"
    onClick={() => props.onQuerySubmit({ dateRange: { from: 'now', to: 'now' } })}
    type="button"
  >
    {'Hello world'}
  </button>
));

describe('AlertsSearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        data: mockDataPlugin,
        unifiedSearch: {
          ui: {
            SearchBar: unifiedSearchBarMock,
          },
        },
        notifications: { toasts: { addWarning: vi.fn() } } as unknown as NotificationsStart,
      },
    });
  });

  it('renders correctly', async () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={vi.fn()}
        onFiltersUpdated={vi.fn()}
        onSavedQueryUpdated={vi.fn()}
        onClearSavedQuery={vi.fn()}
        appName={'test'}
      />
    );
    expect(await screen.findByTestId('querySubmitButton')).toBeInTheDocument();
  });

  it('calls onQuerySubmit correctly', async () => {
    const onQuerySubmitMock = vi.fn();

    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={onQuerySubmitMock}
        onFiltersUpdated={vi.fn()}
        onSavedQueryUpdated={vi.fn()}
        onClearSavedQuery={vi.fn()}
        appName={'test'}
      />
    );

    fireEvent.click(await screen.findByTestId('querySubmitButton'));

    await waitFor(() => {
      expect(onQuerySubmitMock).toHaveBeenCalled();
    });
  });

  it('calls onFiltersUpdated correctly', async () => {
    const onFiltersUpdatedMock = vi.fn();
    const filters: Filter[] = [
      {
        meta: {
          negate: false,
          alias: null,
          disabled: false,
          type: 'custom',
          key: 'query',
        },
        query: { bool: { filter: [{ term: { 'kibana.alert.rule.consumer': 'stackAlerts' } }] } },
        $state: { store: FilterStateStore.APP_STATE },
      },
    ];

    mockUseKibana.mockReturnValue({
      services: {
        data: mockDataPlugin,
        unifiedSearch: {
          ui: {
            SearchBar: vi.fn().mockImplementation((props) => (
              <button
                data-test-subj="filtersSubmitButton"
                onClick={() => props.onFiltersUpdated(filters)}
                type="button"
              >
                {'Hello world'}
              </button>
            )),
          },
        },
        notifications: { toasts: { addWarning: vi.fn() } } as unknown as NotificationsStart,
      },
    });

    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={vi.fn()}
        onFiltersUpdated={onFiltersUpdatedMock}
        onSavedQueryUpdated={vi.fn()}
        onClearSavedQuery={vi.fn()}
        appName={'test'}
      />
    );

    fireEvent.click(await screen.findByTestId('filtersSubmitButton'));

    await waitFor(() => {
      expect(onFiltersUpdatedMock).toHaveBeenCalledWith(filters);
      expect(mockDataPlugin.query.filterManager.setFilters).toHaveBeenCalledWith(filters);
    });
  });

  it('calls the unifiedSearchBar correctly for security rule types', async () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={vi.fn()}
        appName={'test'}
        onFiltersUpdated={vi.fn()}
        ruleTypeIds={['siem.esqlRuleType', '.esQuery']}
      />
    );

    await waitFor(() => {
      expect(unifiedSearchBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestionsAbstraction: undefined,
        }),
        {}
      );
    });
  });

  it('calls the unifiedSearchBar correctly for NON security rule types', async () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={vi.fn()}
        appName={'test'}
        onFiltersUpdated={vi.fn()}
        ruleTypeIds={['.esQuery']}
      />
    );

    await waitFor(() => {
      expect(unifiedSearchBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestionsAbstraction: { type: 'alerts', fields: {} },
        }),
        {}
      );
    });
  });

  it('calls the unifiedSearchBar with correct index patters', async () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={vi.fn()}
        appName={'test'}
        onFiltersUpdated={vi.fn()}
        ruleTypeIds={['.esQuery', 'apm.anomaly']}
      />
    );

    await waitFor(() => {
      expect(unifiedSearchBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: [
            {
              fields: [
                { aggregatable: true, name: 'event.action', searchable: true, type: 'string' },
              ],
              title: '.esQuery,apm.anomaly',
            },
          ],
        }),
        {}
      );
    });
  });

  it('calls the unifiedSearchBar with correct index patters without rule types', async () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={vi.fn()}
        appName={'test'}
        onFiltersUpdated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(unifiedSearchBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: [
            {
              fields: [
                { aggregatable: true, name: 'event.action', searchable: true, type: 'string' },
              ],
              title: '.alerts-*',
            },
          ],
        }),
        {}
      );
    });
  });

  it('calls the unifiedSearchBar with correct index patters without data views', async () => {
    vi.mocked(useAlertsDataView).mockReturnValue({
      isLoading: false,
      dataView: undefined,
    });

    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={vi.fn()}
        appName={'test'}
        onFiltersUpdated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(unifiedSearchBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: [],
        }),
        {}
      );
    });
  });
});
