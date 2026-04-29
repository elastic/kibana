/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('should disable the rule when picking disable in the dropdown', async () => {
    const rule = mockRule({ enabled: true });
    const bulkDisableRules = jest.fn();
    render(
      <IntlProvider locale="en">
        <RuleStatusPanelWithProvider
          {...mockAPIs}
          rule={rule}
          isEditable
          healthColor="primary"
          statusMessage="Ok"
          requestRefresh={requestRefresh}
          bulkDisableRules={bulkDisableRules}
        />
      </IntlProvider>
    );

    if (screen.queryByTestId('centerJustifiedSpinner')) {
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));
    }

    await userEvent.click(screen.getByTestId('ruleStatusDropdownBadge'));

    await userEvent.click(screen.getByTestId('statusDropdownDisabledItem'));

    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => expect(bulkDisableRules).toHaveBeenCalledTimes(1));
  });

  it('should disable the rule when picking disable in the dropdown without showing untrack alerts modal', async () => {
    const rule = mockRule({ enabled: true });
    const bulkDisableRules = jest.fn();
    render(
      <IntlProvider locale="en">
        <RuleStatusPanelWithProvider
          {...mockAPIs}
          rule={rule}
          isEditable
          healthColor="primary"
          statusMessage="Ok"
          requestRefresh={requestRefresh}
          bulkDisableRules={bulkDisableRules}
          autoRecoverAlerts={false}
        />
      </IntlProvider>
    );

    if (screen.queryByTestId('centerJustifiedSpinner')) {
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));
    }

    await userEvent.click(screen.getByTestId('ruleStatusDropdownBadge'));

    await userEvent.click(screen.getByTestId('statusDropdownDisabledItem'));

    expect(screen.queryByTestId('confirmModalConfirmButton')).not.toBeInTheDocument();

    await waitFor(() => expect(bulkDisableRules).toHaveBeenCalledTimes(1));
  });

  it('if rule is already disabled should do nothing when picking disable in the dropdown', async () => {
    const rule = mockRule({ enabled: false });
    const bulkDisableRules = jest.fn();
    render(
      <IntlProvider locale="en">
        <RuleStatusPanelWithProvider
          {...mockAPIs}
          rule={rule}
          isEditable
          healthColor="primary"
          statusMessage="Ok"
          requestRefresh={requestRefresh}
          bulkDisableRules={bulkDisableRules}
        />
      </IntlProvider>
    );

    if (screen.queryByTestId('centerJustifiedSpinner')) {
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));
    }

    await userEvent.click(screen.getByTestId('ruleStatusDropdownBadge'));

    await screen.findByTestId('statusDropdownDisabledItem');
    await userEvent.click(screen.getByTestId('statusDropdownDisabledItem'));

    expect(bulkDisableRules).toHaveBeenCalledTimes(0);
  });

  it('should enable the rule when picking enable in the dropdown', async () => {
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

    if (screen.queryByTestId('centerJustifiedSpinner')) {
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));
    }

    await userEvent.click(screen.getByTestId('ruleStatusDropdownBadge'));

    await screen.findByTestId('statusDropdownEnabledItem');
    await userEvent.click(screen.getByTestId('statusDropdownEnabledItem'));

    await waitFor(() => expect(mockAPIs.bulkEnableRules).toHaveBeenCalledTimes(1));
  });

  it('if rule is already enabled should do nothing when picking enable in the dropdown', async () => {
    const rule = mockRule({ enabled: true });
    const bulkEnableRules = jest.fn();
    render(
      <IntlProvider locale="en">
        <RuleStatusPanelWithProvider
          {...mockAPIs}
          rule={rule}
          isEditable
          healthColor="primary"
          statusMessage="Ok"
          requestRefresh={requestRefresh}
          bulkEnableRules={bulkEnableRules}
        />
      </IntlProvider>
    );

    if (screen.queryByTestId('centerJustifiedSpinner')) {
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));
    }

    await userEvent.click(screen.getByTestId('ruleStatusDropdownBadge'));

    await screen.findByTestId('statusDropdownEnabledItem');
    await userEvent.click(screen.getByTestId('statusDropdownEnabledItem'));

    expect(bulkEnableRules).toHaveBeenCalledTimes(0);
  });
});
