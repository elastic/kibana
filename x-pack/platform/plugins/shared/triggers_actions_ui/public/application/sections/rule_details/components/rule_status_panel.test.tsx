/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { RuleStatusPanelWithApiProps } from './rule_status_panel';
import { RuleStatusPanel } from './rule_status_panel';
import { mockRule } from './test_helpers';

jest.mock('../../../lib/rule_api/load_execution_log_aggregations', () => ({
  loadExecutionLogAggregations: jest.fn(),
}));

const { loadExecutionLogAggregations } = jest.requireMock(
  '../../../lib/rule_api/load_execution_log_aggregations'
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const RuleStatusPanelWithProvider = (props: RuleStatusPanelWithApiProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <RuleStatusPanel {...props} />
    </QueryClientProvider>
  );
};

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addDanger: jest.fn(),
        },
      },
    },
  }),
}));

const mockAPIs = {
  bulkEnableRules: jest.fn().mockResolvedValue({ errors: [] }),
  bulkDisableRules: jest.fn(),
  snoozeRule: jest.fn(),
  unsnoozeRule: jest.fn(),
};
const requestRefresh = jest.fn();

describe('rule status panel', () => {
  beforeEach(() => {
    loadExecutionLogAggregations.mockResolvedValue({
      total: 400,
      data: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and renders the number of executions in the last 24 hours', async () => {
    const rule = mockRule();
    render(
      <IntlProvider locale="en">
        <RuleStatusPanelWithProvider
          {...mockAPIs}
          rule={rule}
          isEditable
          healthColor="primary"
          statusMessage="Ok"
          requestRefresh={requestRefresh}
        />
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('ruleStatus-numberOfExecutions')).toHaveTextContent(
        '400 executions in the last 24 hr'
      );
    });
  });

  it('renders the enabled status as plain text', async () => {
    const rule = mockRule({ enabled: true });
    render(
      <IntlProvider locale="en">
        <RuleStatusPanelWithProvider
          {...mockAPIs}
          rule={rule}
          isEditable
          healthColor="primary"
          statusMessage="Ok"
          requestRefresh={requestRefresh}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('ruleStatusText')).toHaveTextContent('Enabled');
    expect(screen.queryByTestId('ruleStatusDropdownBadge')).not.toBeInTheDocument();
  });

  it('renders the disabled status as plain text', async () => {
    const rule = mockRule({ enabled: false });
    render(
      <IntlProvider locale="en">
        <RuleStatusPanelWithProvider
          {...mockAPIs}
          rule={rule}
          isEditable
          healthColor="primary"
          statusMessage="Ok"
          requestRefresh={requestRefresh}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('ruleStatusText')).toHaveTextContent('Disabled');
  });
});
