/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { within, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../../lib/test_utils';
import { createAppMockRenderer } from '../../../lib/test_utils';
import type { CreateMaintenanceWindowFormProps } from './create_maintenance_windows_form';
import { CreateMaintenanceWindowForm } from './create_maintenance_windows_form';

jest.mock('../../../utils/kibana_react');
jest.mock('../../../services/rule_api', () => ({
  loadRuleTypes: jest.fn(),
}));
jest.mock('@kbn/alerts-ui-shared', () => ({
  ...jest.requireActual('@kbn/alerts-ui-shared'),
  AlertsSearchBar: () => <div data-test-subj="mockAlertsSearchBar" />,
}));

const { loadRuleTypes } = jest.requireMock('../../../services/rule_api');
const { useKibana, useUiSetting } = jest.requireMock('../../../utils/kibana_react');

const formProps: CreateMaintenanceWindowFormProps = {
  onCancel: jest.fn(),
  onSuccess: jest.fn(),
};

const formPropsForEditMode: CreateMaintenanceWindowFormProps = {
  onCancel: jest.fn(),
  onSuccess: jest.fn(),
  initialValue: {
    title: 'test',
    startDate: '2023-03-24',
    endDate: '2023-03-26',
    recurring: false,
    solutionId: 'observability',
    scopedQuery: {
      kql: 'kibana.alert.job_errors_results.job_id : * ',
      filters: [],
      dsl: '{"bool":{"must":[],"filter":[{"bool":{"should":[{"exists":{"field":"kibana.alert.job_errors_results.job_id"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}',
    },
  },
  maintenanceWindowId: 'fake_mw_id',
};

describe('CreateMaintenanceWindowForm', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    loadRuleTypes.mockResolvedValue([
      { category: 'observability' },
      { category: 'management' },
      { category: 'securitySolution' },
    ]);

    useKibana.mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addSuccess: jest.fn(),
            addDanger: jest.fn(),
          },
        },
        unifiedSearch: {
          ui: {
            SearchBar: <div />,
          },
        },
        data: {
          dataViews: {
            get: jest.fn(),
            getIdsWithTitle: jest.fn().mockResolvedValue([]),
            getDefaultDataView: jest.fn(),
          },
        },
      },
    });

    useUiSetting.mockReturnValue('America/New_York');
    appMockRenderer = createAppMockRenderer();
  });

  it('renders all form fields except the recurring form fields', async () => {
    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    await waitFor(() => {
      expect(
        result.queryByTestId('maintenanceWindowCategorySelectionLoading')
      ).not.toBeInTheDocument();
    });

    expect(result.getByTestId('title-field')).toBeInTheDocument();
    expect(result.getByTestId('date-field')).toBeInTheDocument();
    expect(result.getByTestId('recurring-field')).toBeInTheDocument();
    expect(result.queryByTestId('recurring-form')).not.toBeInTheDocument();
    expect(result.queryByTestId('timezone-field')).not.toBeInTheDocument();
  });

  it('renders timezone field when the kibana setting is set to browser', async () => {
    useUiSetting.mockReturnValue('Browser');

    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    await waitFor(() => {
      expect(
        result.queryByTestId('maintenanceWindowCategorySelectionLoading')
      ).not.toBeInTheDocument();
    });

    expect(result.getByTestId('title-field')).toBeInTheDocument();
    expect(result.getByTestId('date-field')).toBeInTheDocument();
    expect(result.getByTestId('recurring-field')).toBeInTheDocument();
    expect(result.queryByTestId('recurring-form')).not.toBeInTheDocument();
    expect(result.getByTestId('timezone-field')).toBeInTheDocument();
  });

  it('should initialize the form when no initialValue provided', () => {
    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    const titleInput = within(result.getByTestId('title-field')).getByTestId(
      'createMaintenanceWindowFormNameInput'
    );
    const dateInputs = within(result.getByTestId('date-field')).getAllByLabelText(
      // using the aria-label to query for the date-picker input
      'Press the down key to open a popover containing a calendar.'
    );
    const recurringInput = within(result.getByTestId('recurring-field')).getByTestId(
      'createMaintenanceWindowRepeatSwitch'
    );

    expect(titleInput).toHaveValue('');
    // except for the date field
    expect(dateInputs[0]).not.toHaveValue('');
    expect(dateInputs[1]).not.toHaveValue('');
    expect(recurringInput).not.toBeChecked();
  });

  it('should prefill the form when provided with initialValue', async () => {
    useUiSetting.mockImplementation((key: string) => {
      if (key === 'dateFormat') return 'YYYY.MM.DD, h:mm:ss';
      return 'America/Los_Angeles';
    });

    const result = appMockRenderer.render(
      <CreateMaintenanceWindowForm
        {...formProps}
        initialValue={{
          title: 'test',
          startDate: '2023-03-24',
          endDate: '2023-03-26',
          timezone: ['America/Los_Angeles'],
          recurring: true,
          solutionId: undefined,
        }}
      />
    );

    const titleInput = within(result.getByTestId('title-field')).getByTestId(
      'createMaintenanceWindowFormNameInput'
    );
    const dateInputs = within(result.getByTestId('date-field')).getAllByLabelText(
      // using the aria-label to query for the date-picker input
      'Press the down key to open a popover containing a calendar.'
    );
    const recurringInput = within(result.getByTestId('recurring-field')).getByTestId(
      'createMaintenanceWindowRepeatSwitch'
    );
    const timezoneInput = within(result.getByTestId('timezone-field')).getByTestId(
      'comboBoxSearchInput'
    );

    expect(titleInput).toHaveValue('test');
    expect(dateInputs[0]).toHaveValue('2023.03.23, 9:00:00');
    expect(dateInputs[1]).toHaveValue('2023.03.25, 9:00:00');
    expect(recurringInput).toBeChecked();
    expect(timezoneInput).toHaveValue('America/Los_Angeles');
  });

  it('should initialize MW with selected solution id properly', async () => {
    appMockRenderer.render(
      <CreateMaintenanceWindowForm
        {...formProps}
        initialValue={{
          title: 'test',
          startDate: '2023-03-24',
          endDate: '2023-03-26',
          timezone: ['America/Los_Angeles'],
          recurring: true,
          solutionId: 'observability',
          scopedQuery: {
            filters: [],
            kql: 'kibana.alert.job_errors_results.job_id : * ',
            dsl: '{"bool":{"must":[],"filter":[{"bool":{"should":[{"exists":{"field":"kibana.alert.job_errors_results.job_id"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}',
          },
        }}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('maintenanceWindowSolutionSelectionLoading')
      ).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('maintenanceWindowSolutionSelection')).toBeInTheDocument();
    });

    const observabilityInput = screen.getByLabelText('Observability rules');
    const securityInput = screen.getByLabelText('Security rules');
    const managementInput = screen.getByLabelText('Stack rules');

    expect(observabilityInput).toBeChecked();
    expect(managementInput).not.toBeChecked();
    expect(securityInput).not.toBeChecked();
  });

  it('can select one in the time solution id', async () => {
    const user = userEvent.setup();
    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    await waitFor(() => {
      expect(
        result.queryByTestId('maintenanceWindowSolutionSelectionLoading')
      ).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('maintenanceWindowSolutionSelection')).not.toBeInTheDocument();
    });

    const switchContainer = screen.getByTestId('maintenanceWindowScopedQuerySwitch');
    const scopedQueryToggle = within(switchContainer).getByRole('switch');

    expect(scopedQueryToggle).not.toBeChecked();
    await user.click(scopedQueryToggle);
    expect(scopedQueryToggle).toBeChecked();

    const observabilityInput = screen.getByLabelText('Observability rules');
    const securityInput = screen.getByLabelText('Security rules');
    const managementInput = screen.getByLabelText('Stack rules');

    await user.click(securityInput);

    expect(observabilityInput).not.toBeChecked();
    expect(managementInput).not.toBeChecked();
    expect(securityInput).toBeChecked();

    await user.click(observabilityInput);

    expect(observabilityInput).toBeChecked();
    expect(managementInput).not.toBeChecked();
    expect(securityInput).not.toBeChecked();
  });

  it('should hide "Filter alerts" toggle when do not have access to any solutions', async () => {
    loadRuleTypes.mockResolvedValue([]);
    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    await waitFor(() => {
      expect(
        result.queryByTestId('maintenanceWindowSolutionSelectionLoading')
      ).not.toBeInTheDocument();
    });

    expect(screen.queryByTestId('maintenanceWindowScopedQuerySwitch')).not.toBeInTheDocument();
  });

  it('should show warning when edit if "Filter alerts" toggle on when do not have access to chosen solution', async () => {
    loadRuleTypes.mockResolvedValue([]);
    const result = appMockRenderer.render(
      <CreateMaintenanceWindowForm {...formPropsForEditMode} />
    );

    await waitFor(() => {
      expect(
        result.queryByTestId('maintenanceWindowSolutionSelectionLoading')
      ).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('maintenanceWindowNoAvailableSolutionsWarning')).toBeInTheDocument();
  });
});
