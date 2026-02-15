/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  fireEvent,
} from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { act } from 'react-dom/test-utils';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
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
    const wrapper = mountWithIntl(
      <RuleStatusPanelWithProvider
        {...mockAPIs}
        rule={rule}
        isEditable
        healthColor="primary"
        statusMessage="Ok"
        requestRefresh={requestRefresh}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    const ruleExecutionsDescription = wrapper.find(
      '[data-test-subj="ruleStatus-numberOfExecutions"]'
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(ruleExecutionsDescription.first().text()).toBe('400 executions in the last 24 hr');
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

    fireEvent.click(screen.getByTestId('ruleStatusDropdownBadge'));

    fireEvent.click(screen.getByTestId('statusDropdownDisabledItem'));

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(screen.queryByRole('progressbar')).toBeInTheDocument();

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

    fireEvent.click(screen.getByTestId('ruleStatusDropdownBadge'));

    fireEvent.click(screen.getByTestId('statusDropdownDisabledItem'));

    expect(screen.queryByRole('confirmModalConfirmButton')).not.toBeInTheDocument();

    expect(screen.queryByRole('progressbar')).toBeInTheDocument();

    await waitFor(() => expect(bulkDisableRules).toHaveBeenCalledTimes(1));
  });

  it('if rule is already disabled should do nothing when picking disable in the dropdown', async () => {
    const rule = mockRule({ enabled: false });
    const bulkDisableRules = jest.fn();
    const wrapper = mountWithIntl(
      <RuleStatusPanelWithProvider
        {...mockAPIs}
        rule={rule}
        isEditable
        healthColor="primary"
        statusMessage="Ok"
        requestRefresh={requestRefresh}
        bulkDisableRules={bulkDisableRules}
      />
    );
    const actionsElem = wrapper.find('[data-test-subj="statusDropdown"] button').first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('button.euiContextMenuItem');
      actionsMenuItemElem.at(1).simulate('click');
      await nextTick();
    });

    expect(bulkDisableRules).toHaveBeenCalledTimes(0);
  });

  it('should enable the rule when picking enable in the dropdown', async () => {
    const rule = mockRule({ enabled: false });
    const wrapper = mountWithIntl(
      <RuleStatusPanelWithProvider
        {...mockAPIs}
        rule={rule}
        isEditable
        healthColor="primary"
        statusMessage="Ok"
        requestRefresh={requestRefresh}
      />
    );
    const actionsElem = wrapper.find('[data-test-subj="statusDropdown"] button').first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('button.euiContextMenuItem');
      actionsMenuItemElem.at(0).simulate('click');
      await nextTick();
    });

    expect(mockAPIs.bulkEnableRules).toHaveBeenCalledTimes(1);
  });

  it('if rule is already enabled should do nothing when picking enable in the dropdown', async () => {
    const rule = mockRule({ enabled: true });
    const bulkEnableRules = jest.fn();
    const wrapper = mountWithIntl(
      <RuleStatusPanelWithProvider
        {...mockAPIs}
        rule={rule}
        isEditable
        healthColor="primary"
        statusMessage="Ok"
        requestRefresh={requestRefresh}
        bulkEnableRules={bulkEnableRules}
      />
    );
    const actionsElem = wrapper.find('[data-test-subj="statusDropdown"] button').first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('button.euiContextMenuItem');
      actionsMenuItemElem.at(0).simulate('click');
      await nextTick();
    });

    expect(bulkEnableRules).toHaveBeenCalledTimes(0);
  });
});
