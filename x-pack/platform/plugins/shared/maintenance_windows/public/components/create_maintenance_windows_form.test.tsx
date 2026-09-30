/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { within, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';
import type { CreateMaintenanceWindowFormProps } from './create_maintenance_windows_form';
import { CreateMaintenanceWindowForm } from './create_maintenance_windows_form';
import moment from 'moment';
import { getRuleTypes } from '@kbn/response-ops-rules-apis/apis/get_rule_types';
import { useKibana, useUiSetting } from '../utils/kibana_react';
import { useCreateMaintenanceWindow } from '../hooks/use_create_maintenance_window';
import { useUpdateMaintenanceWindow } from '../hooks/use_update_maintenance_window';

vi.mock('../utils/kibana_react');
vi.mock('@kbn/response-ops-rules-apis/apis/get_rule_types', () => {
  const mocked = {
    getRuleTypes: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/alerts-ui-shared', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/alerts-ui-shared')),
    AlertsSearchBar: () => <div data-test-subj="mockAlertsSearchBar" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../hooks/use_create_maintenance_window', () => {
  const mocked = {
    useCreateMaintenanceWindow: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../hooks/use_update_maintenance_window', () => {
  const mocked = {
    useUpdateMaintenanceWindow: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./episode_matcher_input', () => {
  const mocked = {
    EpisodeMatcherInput: () => <div data-test-subj="mockEpisodeMatcherInput" />,
  };
  return { ...mocked, default: mocked };
});

const formProps: CreateMaintenanceWindowFormProps = {
  onCancel: vi.fn(),
  onSuccess: vi.fn(),
};

const formPropsForEditMode: CreateMaintenanceWindowFormProps = {
  onCancel: vi.fn(),
  onSuccess: vi.fn(),
  initialValue: {
    title: 'test',
    startDate: '2023-03-24',
    endDate: '2023-03-26',
    recurring: false,
    scope: {
      alerting: {
        kql: 'kibana.alert.job_errors_results.job_id : * ',
        filters: [],
        dsl: '{"bool":{"must":[],"filter":[{"bool":{"should":[{"exists":{"field":"kibana.alert.job_errors_results.job_id"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}',
      },
    },
  },
  maintenanceWindowId: 'fake_mw_id',
};

describe('CreateMaintenanceWindowForm', () => {
  let appMockRenderer: AppMockRenderer;
  let createMutate: Mock;
  let updateMutate: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    createMutate = vi.fn();
    updateMutate = vi.fn();
    vi.mocked(getRuleTypes).mockResolvedValue([
      { category: 'observability' },
      { category: 'management' },
      { category: 'securitySolution' },
    ]);

    vi.mocked(useCreateMaintenanceWindow).mockReturnValue({
      mutate: createMutate,
      isLoading: false,
    });
    vi.mocked(useUpdateMaintenanceWindow).mockReturnValue({
      mutate: updateMutate,
      isLoading: false,
    });

    vi.mocked(useKibana).mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addSuccess: vi.fn(),
            addDanger: vi.fn(),
          },
        },
        unifiedSearch: {
          ui: {
            SearchBar: <div />,
          },
        },
        data: {
          dataViews: {
            get: vi.fn(),
            getIdsWithTitle: vi.fn().mockResolvedValue([]),
            getDefaultDataView: vi.fn(),
          },
        },
      },
    });

    vi.mocked(useUiSetting).mockReturnValue('America/New_York');
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
    expect(result.queryByTestId('timezone-field')).toBeInTheDocument();
    expect(result.queryByTestId('recurring-form')).not.toBeInTheDocument();
  });

  it('renders timezone field when the kibana setting is set to browser', async () => {
    vi.mocked(useUiSetting).mockReturnValue('Browser');

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

  it('renders the timezone field for any non-"Browser" kibana setting value', async () => {
    vi.mocked(useUiSetting).mockReturnValue('America/Los_Angeles');

    appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    expect(await screen.findByTestId('title-field')).toBeInTheDocument();
    expect(await screen.findByTestId('date-field')).toBeInTheDocument();
    expect(await screen.findByTestId('recurring-field')).toBeInTheDocument();
    expect(screen.queryByTestId('recurring-form')).not.toBeInTheDocument();
    expect(await screen.findByTestId('timezone-field')).toBeInTheDocument();
  });

  it('should render the guessed timezone when kibana timezone is undefined', async () => {
    vi.mocked(useUiSetting).mockReturnValue(undefined);
    vi.spyOn(moment.tz, 'guess').mockReturnValue('America/Los_Angeles');
    appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    expect(await screen.findByTestId('title-field')).toBeInTheDocument();
    expect(await screen.findByTestId('date-field')).toBeInTheDocument();
    expect(await screen.findByTestId('recurring-field')).toBeInTheDocument();
    expect(screen.queryByTestId('recurring-form')).not.toBeInTheDocument();

    const timezoneInput = within(await screen.findByTestId('timezone-field')).getByTestId(
      'comboBoxSearchInput'
    );

    expect(timezoneInput).toHaveValue('America/Los_Angeles');
  });

  it('should initialize the form when no initialValue provided', async () => {
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

    // Alerts (v1) defaults ON; Episodes (v2) stays OFF.
    await waitFor(() => {
      expect(result.getByTestId('maintenanceWindowScopedQuerySwitch')).toBeChecked();
    });
    expect(result.getByTestId('alertingV2ScopedQuerySwitch')).not.toBeChecked();
  });

  it('should prefill the form when provided with initialValue', async () => {
    vi.mocked(useUiSetting).mockImplementation((key: string) => {
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
    vi.mocked(getRuleTypes).mockResolvedValue([]);
    appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    expect(await screen.findByTestId('maintenanceWindowScopedQuerySwitch')).toBeInTheDocument();
  });

  it('should show warning correctly when scoped query filter is on and scope query is set', async () => {
    appMockRenderer.render(<CreateMaintenanceWindowForm {...formPropsForEditMode} />);

    expect(
      await screen.findByTestId('maintenanceWindowMultipleSolutionsRemovedWarning')
    ).toBeInTheDocument();
  });

  it('should show warning correctly when showMultipleSolutionsWarning is true', async () => {
    appMockRenderer.render(
      <CreateMaintenanceWindowForm {...formProps} showMultipleSolutionsWarning={true} />
    );

    expect(
      await screen.findByTestId('maintenanceWindowMultipleSolutionsRemovedWarning')
    ).toBeInTheDocument();
  });

  it('should hide warning correctly by default', async () => {
    appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    expect(
      screen.queryByTestId('maintenanceWindowMultipleSolutionsRemovedWarning')
    ).not.toBeInTheDocument();
  });

  describe('confirmation modal for saving without filters', () => {
    const user = userEvent.setup({ delay: null });

    const fillTitle = async () => {
      const titleInput = await screen.findByTestId('createMaintenanceWindowFormNameInput');
      await user.click(titleInput);
      await user.paste('My window');
    };

    it('does not show the modal and creates with default scope when Alerts is on', async () => {
      // Alerts defaults ON — submitting without touching toggles must skip the modal.
      appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

      await fillTitle();
      await user.click(screen.getByTestId('create-submit'));

      await waitFor(() => {
        expect(createMutate).toHaveBeenCalledTimes(1);
        expect(createMutate.mock.calls[0][0]).toMatchObject({
          title: 'My window',
          scope: { alerting: { enabled: true } },
        });
      });
      expect(screen.queryByTestId('saveWithoutFiltersConfirmModal')).not.toBeInTheDocument();
    });

    it('calls create when user toggles Alerts off then confirms save without filters modal', async () => {
      appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

      await fillTitle();
      // Turn v1 off so the "no scope" path is reached.
      await user.click(await screen.findByTestId('maintenanceWindowScopedQuerySwitch'));

      await user.click(screen.getByTestId('create-submit'));

      const modal = await screen.findByTestId('saveWithoutFiltersConfirmModal');
      await user.click(within(modal).getByRole('button', { name: 'Save without scope' }));

      await waitFor(() => {
        expect(createMutate).toHaveBeenCalledTimes(1);
        expect(createMutate.mock.calls[0][0]).toMatchObject({
          title: 'My window',
          scope: {},
        });
      });
      expect(screen.queryByTestId('saveWithoutFiltersConfirmModal')).not.toBeInTheDocument();
    });

    it('does not call create when user cancels save without filters modal', async () => {
      appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

      await fillTitle();
      // Turn v1 off first so the modal appears.
      await user.click(await screen.findByTestId('maintenanceWindowScopedQuerySwitch'));
      await user.click(screen.getByTestId('create-submit'));

      const modal = await screen.findByTestId('saveWithoutFiltersConfirmModal');
      await user.click(within(modal).getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByTestId('saveWithoutFiltersConfirmModal')).not.toBeInTheDocument();
      });
      expect(createMutate).not.toHaveBeenCalled();
    });

    it('does not show confirmation modal when saving with filters (scoped query present)', async () => {
      appMockRenderer.render(<CreateMaintenanceWindowForm {...formPropsForEditMode} />);

      await user.click(await screen.findByTestId('create-submit'));

      await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
      expect(screen.queryByTestId('saveWithoutFiltersConfirmModal')).not.toBeInTheDocument();
    });
  });

  describe('onCreateOrUpdateError — scope-aware error routing', () => {
    let capturedOnError: ((error: unknown) => void) | undefined;

    beforeEach(() => {
      // Switch to mockImplementation so we can capture the onError callback.
      vi.mocked(useCreateMaintenanceWindow).mockImplementation(
        (props?: { onError?: (e: unknown) => void }) => {
          capturedOnError = props?.onError;
          return { mutate: createMutate, isLoading: false };
        }
      );
    });

    const buildError = (scopeErrors: Array<{ scope: string; message: string }>) => ({
      body: {
        statusCode: 400,
        message: `Error validating create maintenance window data - invalid scope - parse error`,
        attributes: { scopeErrors },
      },
    });

    const buildFallbackError = (message: string) => ({
      body: { statusCode: 400, message },
    });

    it('shows "Invalid episode filter." under the Episodes field (v2) when attributes name alertingV2', async () => {
      appMockRenderer.render(
        <CreateMaintenanceWindowForm
          {...formProps}
          initialValue={{
            title: 'test',
            startDate: '2023-03-24',
            endDate: '2023-03-26',
            recurring: false,
            scope: {
              alerting: { kql: 'kibana.alert.rule.name : "x"', filters: [], dsl: '{}' },
              alertingV2: { enabled: true, kql: 'bad_kql:' },
            },
          }}
          maintenanceWindowId="fake_mw_id"
        />
      );

      // Trigger onError from the hook with a structured attributes payload.
      expect(capturedOnError).toBeDefined();
      capturedOnError!(buildError([{ scope: 'alertingV2', message: 'parse error' }]));

      await waitFor(() => {
        expect(screen.getByText('Invalid episode filter.')).toBeInTheDocument();
      });
      // v1 field must NOT show an error.
      expect(screen.queryByText('Invalid scoped query.')).not.toBeInTheDocument();
    });

    it('shows "Invalid scoped query." under the alerts (v1) field when attributes name alerting', async () => {
      appMockRenderer.render(<CreateMaintenanceWindowForm {...formPropsForEditMode} />);

      expect(capturedOnError).toBeDefined();
      capturedOnError!(buildError([{ scope: 'alerting', message: 'parse error' }]));

      await waitFor(() => {
        expect(screen.getByText('Invalid scoped query.')).toBeInTheDocument();
      });
      expect(screen.queryByText('Invalid episode filter.')).not.toBeInTheDocument();
    });

    it('does not show any inline error when attributes are absent', async () => {
      appMockRenderer.render(<CreateMaintenanceWindowForm {...formPropsForEditMode} />);

      expect(capturedOnError).toBeDefined();
      // Error without structured attributes — no inline field error should appear.
      capturedOnError!(buildFallbackError('Failed to create maintenance window'));

      // Give React a tick to settle; neither error string should be rendered.
      await waitFor(() => {
        expect(screen.queryByText('Invalid scoped query.')).not.toBeInTheDocument();
        expect(screen.queryByText('Invalid episode filter.')).not.toBeInTheDocument();
      });
    });
  });
});
