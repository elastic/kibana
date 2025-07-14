/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { within, waitFor, screen } from '@testing-library/react';
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

  it('should show "Filter alerts" toggle', async () => {
    appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    expect(await screen.findByTestId('maintenanceWindowScopedQuerySwitch')).toBeInTheDocument();
  });

  it('should show "Filter alerts" toggle even when no rule types', async () => {
    loadRuleTypes.mockResolvedValue([]);
    appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    expect(await screen.findByTestId('maintenanceWindowScopedQuerySwitch')).toBeInTheDocument();
  });

  it('should show warning to inform user that multiple solution categories are not available', async () => {
    appMockRenderer.render(<CreateMaintenanceWindowForm {...formPropsForEditMode} />);

    expect(
      await screen.findByTestId('maintenanceWindowSolutionCategoryRemovedCallout')
    ).toBeInTheDocument();
  });
});
