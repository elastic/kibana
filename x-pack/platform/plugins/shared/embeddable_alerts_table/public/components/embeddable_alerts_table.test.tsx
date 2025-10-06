/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import type { AlertsTableProps } from '@kbn/response-ops-alerts-table/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PERSISTED_TABLE_CONFIG_KEY_PREFIX } from '../constants';
import { EmbeddableAlertsTable } from './embeddable_alerts_table';
import type { RuleTypeSolution } from '@kbn/alerting-types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {},
  },
});

const core = coreMock.createStart();
core.http.get.mockResolvedValue([
  {
    id: 'o11y-rule-type',
    solution: 'observability',
  },
]);
const services = core as unknown as AlertsTableProps['services'];

jest.mock('@kbn/response-ops-alerts-table', () => ({
  AlertsTable: jest.fn(() => <div data-test-subj="alertsTable" />),
}));
const { AlertsTable: mockAlertsTable } = jest.requireMock('@kbn/response-ops-alerts-table');

const TABLE_ID = `${PERSISTED_TABLE_CONFIG_KEY_PREFIX}-uuid`;

describe('EmbeddableAlertsTable', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('should not render the alerts table until the rule types have been loaded', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EmbeddableAlertsTable
          id={TABLE_ID}
          timeRange={{
            from: '2025-01-01T00:00:00.000Z',
            to: '2025-01-01T01:00:00.000Z',
          }}
          services={services}
        />
      </QueryClientProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should not render the alerts table if the rule types cannot been loaded', async () => {
    core.http.get.mockImplementationOnce(() => {
      throw new Error('Error loading rule types');
    });
    render(
      <QueryClientProvider client={queryClient}>
        <EmbeddableAlertsTable
          id={TABLE_ID}
          timeRange={{
            from: '2025-01-01T00:00:00.000Z',
            to: '2025-01-01T01:00:00.000Z',
          }}
          services={services}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Cannot load rule types')).toBeInTheDocument();
  });

  it('should show a missing auth prompt if the solution rule types are not accessible', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EmbeddableAlertsTable
          id={TABLE_ID}
          solution="security"
          timeRange={{
            from: '2025-01-01T00:00:00.000Z',
            to: '2025-01-01T01:00:00.000Z',
          }}
          services={services}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Missing alerting authorizations')).toBeInTheDocument();
  });

  it('should render the alerts table with the correct time range and base props', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EmbeddableAlertsTable
          id={TABLE_ID}
          timeRange={{
            from: '2025-01-01T00:00:00.000Z',
            to: '2025-01-01T01:00:00.000Z',
          }}
          services={services}
        />
      </QueryClientProvider>
    );
    expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();
    expect(mockAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: TABLE_ID,
        query: {
          bool: {
            must: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      range: {
                        'kibana.alert.time_range': {
                          format: 'strict_date_optional_time',
                          gte: '2025-01-01T00:00:00.000Z',
                          lte: '2025-01-01T01:00:00.000Z',
                        },
                      },
                    },
                    {
                      range: {
                        '@timestamp': {
                          format: 'strict_date_optional_time',
                          gte: '2025-01-01T00:00:00.000Z',
                          lte: '2025-01-01T01:00:00.000Z',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        showAlertStatusWithFlapping: true,
        toolbarVisibility: {
          showFullScreenSelector: false,
          showColumnSelector: false,
          showSortSelector: false,
          showKeyboardShortcuts: false,
          showDisplaySelector: false,
        },
        emptyState: {
          height: 'flex',
          variant: 'transparent',
        },
        openLinksInNewTab: true,
        browserFields: {},
      }),
      {}
    );
  });

  it('should render the alerts table with the correct time range and filters query', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EmbeddableAlertsTable
          id={TABLE_ID}
          timeRange={{
            from: '2025-01-01T00:00:00.000Z',
            to: '2025-01-01T01:00:00.000Z',
          }}
          query={{
            type: 'alertsFilters',
            filters: [
              { filter: { type: 'ruleTags', value: ['tag1'] } },
              { operator: 'and' },
              { filter: { type: 'ruleTypes', value: ['type1'] } },
            ],
          }}
          services={services}
        />
      </QueryClientProvider>
    );
    expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();
    expect(mockAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: TABLE_ID,
        query: {
          bool: {
            must: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      range: {
                        'kibana.alert.time_range': {
                          format: 'strict_date_optional_time',
                          gte: '2025-01-01T00:00:00.000Z',
                          lte: '2025-01-01T01:00:00.000Z',
                        },
                      },
                    },
                    {
                      range: {
                        '@timestamp': {
                          format: 'strict_date_optional_time',
                          gte: '2025-01-01T00:00:00.000Z',
                          lte: '2025-01-01T01:00:00.000Z',
                        },
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  filter: [
                    {
                      bool: {
                        should: [
                          {
                            match: {
                              'kibana.alert.rule.tags': 'tag1',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            match: {
                              'kibana.alert.rule.rule_type_id': 'type1',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        showAlertStatusWithFlapping: true,
        toolbarVisibility: {
          showFullScreenSelector: false,
          showColumnSelector: false,
          showSortSelector: false,
          showKeyboardShortcuts: false,
          showDisplaySelector: false,
        },
        emptyState: {
          height: 'flex',
          variant: 'transparent',
        },
        openLinksInNewTab: true,
        browserFields: {},
      }),
      {}
    );
  });

  it.each(['observability', 'stack', 'security'] as RuleTypeSolution[])(
    'should pass the correct rule type ids to the table when `solution` is %s',
    async (solution) => {
      const ruleTypes = [
        {
          id: 'o11y-rule-type',
          solution: 'observability',
        },
        {
          id: 'stack-rule-type',
          solution: 'stack',
        },
        {
          id: 'security-rule-type',
          solution: 'security',
        },
      ];
      core.http.get.mockResolvedValueOnce(ruleTypes);
      render(
        <QueryClientProvider client={queryClient}>
          <EmbeddableAlertsTable
            id={TABLE_ID}
            timeRange={{
              from: '2025-01-01T00:00:00.000Z',
              to: '2025-01-01T01:00:00.000Z',
            }}
            solution={solution}
            services={services}
          />
        </QueryClientProvider>
      );
      expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();
      expect(mockAlertsTable).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleTypeIds: ruleTypes
            .filter(
              (type) =>
                type.solution === solution ||
                (solution === 'observability' && type.solution === 'stack')
            )
            .map(({ id }) => id),
        }),
        {}
      );
    }
  );
});
