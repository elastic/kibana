/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiProvider } from '@elastic/eui';
import { ThemeProvider } from '@emotion/react';

import { PackForm } from '.';
import { queryClient } from '../../query_client';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../common/experimental_features';

const mockUseRouterNavigate = jest.fn();

beforeAll(() => {
  ExperimentalFeaturesService.init({
    experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: false },
  });
});

jest.mock('../../common/lib/kibana', () => ({
  ...jest.requireActual('../../common/lib/kibana'),
  useRouterNavigate: (path: string) => {
    mockUseRouterNavigate(path);

    return {
      onClick: jest.fn(),
      href: path,
    };
  },
}));

jest.mock('../../agent_policies', () => ({
  useAgentPolicies: () => ({
    data: {
      agentPoliciesById: {},
    },
  }),
}));

jest.mock('../use_create_pack', () => ({
  useCreatePack: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock('../use_update_pack', () => ({
  useUpdatePack: () => ({
    mutateAsync: jest.fn(),
  }),
}));

const renderWithContext = (Element: React.ReactElement) =>
  render(
    <EuiProvider>
      <ThemeProvider
        theme={{
          euiTheme: {
            colors: { primary: '#006BB4' },
            border: { width: { thin: '1px' } },
            size: { base: '16px' },
          } as unknown as EuiThemeComputed<{}>,
        }}
      >
        <IntlProvider locale={'en'}>
          <QueryClientProvider client={queryClient}>{Element}</QueryClientProvider>
        </IntlProvider>
      </ThemeProvider>
    </EuiProvider>
  );

describe('PackForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use packId for cancel button navigation in edit mode when provided', async () => {
    const testPackId = 'test-pack-id-123';
    const defaultValue = {
      id: 'different-id',
      saved_object_id: 'saved-object-id',
      name: 'Test Pack',
      description: 'Test Description',
      enabled: true,
      queries: {},
      created_at: '2024-01-01',
      created_by: 'test-user',
      updated_at: '2024-01-01',
      updated_by: 'test-user',
      policy_ids: [],
      references: [],
    };

    renderWithContext(<PackForm editMode={true} defaultValue={defaultValue} packId={testPackId} />);

    expect(mockUseRouterNavigate).toHaveBeenCalledWith(`packs/${testPackId}`);
  });

  it('should fallback to defaultValue.id for cancel button navigation when packId not provided', async () => {
    const defaultValue = {
      id: 'fallback-id',
      saved_object_id: 'saved-object-id',
      name: 'Test Pack',
      description: 'Test Description',
      enabled: true,
      queries: {},
      created_at: '2024-01-01',
      created_by: 'test-user',
      updated_at: '2024-01-01',
      updated_by: 'test-user',
      policy_ids: [],
      references: [],
    };

    renderWithContext(<PackForm editMode={true} defaultValue={defaultValue} />);

    expect(mockUseRouterNavigate).toHaveBeenCalledWith(`packs/${defaultValue.id}`);
  });

  it('should use empty string for cancel button navigation in create mode', async () => {
    renderWithContext(<PackForm editMode={false} />);

    expect(mockUseRouterNavigate).toHaveBeenCalledWith('packs/');
  });

  it('should prioritize packId over defaultValue.id when both are provided', async () => {
    const testPackId = 'priority-pack-id';
    const defaultValue = {
      id: 'should-not-be-used',
      saved_object_id: 'saved-object-id',
      name: 'Test Pack',
      description: 'Test Description',
      enabled: true,
      queries: {},
      created_at: '2024-01-01',
      created_by: 'test-user',
      updated_at: '2024-01-01',
      updated_by: 'test-user',
      policy_ids: [],
      references: [],
    };

    renderWithContext(<PackForm editMode={true} defaultValue={defaultValue} packId={testPackId} />);

    expect(mockUseRouterNavigate).toHaveBeenCalledWith(`packs/${testPackId}`);
    expect(mockUseRouterNavigate).not.toHaveBeenCalledWith(`packs/${defaultValue.id}`);
  });

  describe('rruleScheduling feature flag', () => {
    const rrulePackDefaultValue = {
      id: 'rrule-pack-id',
      saved_object_id: 'rrule-pack-saved-object-id',
      name: 'Daily Pack',
      description: 'A pack scheduled via RRULE',
      enabled: true,
      queries: {},
      created_at: '2024-01-01',
      created_by: 'test-user',
      updated_at: '2024-01-01',
      updated_by: 'test-user',
      policy_ids: [],
      references: [],
      schedule_type: 'rrule' as const,
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2024-01-01T00:00:00.000Z',
      },
    };

    afterEach(() => {
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: false },
      });
    });

    it('hides ScheduleSection and does not advertise schedule fields when the flag is off', () => {
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: false },
      });

      const { queryByTestId } = renderWithContext(
        <PackForm editMode={true} defaultValue={rrulePackDefaultValue} />
      );

      // Wire-boundary guarantee: with the flag off, the ScheduleSection does
      // not mount even if the SO already carries `schedule_type: 'rrule'`. This
      // pairs with the server-side D25 wire gate so a downgrade is a clean
      // "pretend this never happened" experience.
      expect(queryByTestId('osquery-schedule-section')).toBeNull();
      expect(queryByTestId('osquery-schedule-type-selector')).toBeNull();
    });

    it('renders ScheduleSection in recurrence mode when the flag flips on and the SO carries an RRULE', () => {
      // Simulate the flag-flip race: a pack form is being prepared while the
      // operator flips the flag on. The form mounts (or remounts) with
      // `rruleScheduling: true` and an SO that already carries RRULE state —
      // the deserializer SHALL hydrate the recurrence form, not silently fall
      // back to interval defaults.
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: true },
      });

      const { getByTestId } = renderWithContext(
        <PackForm editMode={true} defaultValue={rrulePackDefaultValue} />
      );

      const section = getByTestId('osquery-schedule-section');
      const typeSelector = getByTestId('osquery-schedule-type-selector');

      expect(section).toBeInTheDocument();
      // The radio group exposes both options; the recurrence one is selected.
      const recurrenceRadio = typeSelector.querySelector(
        'input[id$="osquery-schedule-type-rrule"]'
      ) as HTMLInputElement | null;
      expect(recurrenceRadio).not.toBeNull();
      expect(recurrenceRadio?.checked).toBe(true);
    });
  });
});
