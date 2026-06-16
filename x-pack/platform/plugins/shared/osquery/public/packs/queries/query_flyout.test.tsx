/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';

// --- Kibana services ---
jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        capabilities: {
          osquery: {
            writeSavedQueries: true,
            readSavedQueries: true,
            writeLiveQueries: true,
            runSavedQueries: true,
          },
        },
      },
    },
  }),
}));

// --- Heavy child component stubs ---
jest.mock('../../saved_queries/form/code_editor_field', () => ({
  CodeEditorField: () => <div data-test-subj="codeEditorField">Editor</div>,
}));

jest.mock('./lazy_ecs_mapping_editor_field', () => ({
  ECSMappingEditorField: () => <div data-test-subj="ecsMappingEditor">ECS Mapping</div>,
}));

// Track the onChange callback from SavedQueriesDropdown
let savedQueryOnChange: ((value: Record<string, unknown>) => void) | null = null;
jest.mock('../../saved_queries/saved_queries_dropdown', () => ({
  SavedQueriesDropdown: ({ onChange }: { onChange: (value: Record<string, unknown>) => void }) => {
    savedQueryOnChange = onChange;

    return <div data-test-subj="savedQueriesDropdown">Saved Queries</div>;
  },
}));

// Stub ScheduleSection so the flyout tests don't pull in the full EUI form
// tree. Render a minimal marker that surfaces the schedule type so tests can
// assert the value the flyout passed in.
jest.mock('../../components/schedule_section', () => ({
  ScheduleSection: ({ value }: { value: Record<string, unknown> }) => (
    <div data-test-subj="mocked-schedule-section">
      {JSON.stringify(value?.scheduleType ?? 'unknown')}
    </div>
  ),
}));

import { QueryFlyout } from './query_flyout';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../common/experimental_features';

beforeAll(() => {
  ExperimentalFeaturesService.init({
    experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: false },
  });
});

const renderFlyout = (props: Partial<React.ComponentProps<typeof QueryFlyout>> = {}) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <QueryFlyout uniqueQueryIds={[]} onSave={jest.fn()} onClose={jest.fn()} {...props} />
      </IntlProvider>
    </EuiProvider>
  );

describe('QueryFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    savedQueryOnChange = null;
  });

  describe('add mode', () => {
    it('should show "Attach next query" title', () => {
      renderFlyout();
      expect(screen.getByText('Attach next query')).toBeInTheDocument();
    });

    it('should show saved queries dropdown', () => {
      renderFlyout();
      expect(screen.getByTestId('savedQueriesDropdown')).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    const defaultValue = {
      id: 'existing-query',
      query: 'select * from uptime;',
      interval: '3600',
      shards: {} as Record<string, number>,
    };

    it('should show "Edit query" title', () => {
      renderFlyout({ defaultValue });
      expect(screen.getByText('Edit query')).toBeInTheDocument();
    });

    it('should not show saved queries dropdown', () => {
      renderFlyout({ defaultValue });
      expect(screen.queryByTestId('savedQueriesDropdown')).not.toBeInTheDocument();
    });
  });

  describe('ID validation', () => {
    it('should show "ID must be unique" when entering a duplicate ID', async () => {
      renderFlyout({ uniqueQueryIds: ['existing-query'] });

      const idInput = screen.getByRole('textbox', { name: /ID/i });
      fireEvent.change(idInput, { target: { value: 'existing-query' } });

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));

      await waitFor(() => {
        expect(screen.getByText('ID must be unique')).toBeInTheDocument();
      });
    });

    it('should show "ID must be unique" when saved query selection conflicts with existing ID', async () => {
      renderFlyout({ uniqueQueryIds: ['conflicting-query'] });

      // Simulate selecting a saved query whose ID conflicts — resetField triggers
      // React state updates, so wrap in act()
      expect(savedQueryOnChange).not.toBeNull();
      act(() => {
        savedQueryOnChange!({
          id: 'conflicting-query',
          query: 'select * from uptime;',
        });
      });

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));

      await waitFor(() => {
        expect(screen.getByText('ID must be unique')).toBeInTheDocument();
      });
    });

    it('should not show uniqueness error when ID is unique', async () => {
      renderFlyout({ uniqueQueryIds: ['existing-query'] });

      const idInput = screen.getByRole('textbox', { name: /ID/i });
      fireEvent.change(idInput, { target: { value: 'brand-new-query' } });

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));

      await waitFor(() => {
        expect(screen.queryByText('ID must be unique')).not.toBeInTheDocument();
      });
    });
  });

  describe('buttons', () => {
    it('should render Cancel and Save buttons', () => {
      renderFlyout();
      expect(screen.getByTestId('query-flyout-cancel-button')).toBeInTheDocument();
      expect(screen.getByTestId('query-flyout-save-button')).toBeInTheDocument();
    });

    it('should call onClose when Cancel is clicked', () => {
      const onClose = jest.fn();
      renderFlyout({ onClose });

      fireEvent.click(screen.getByTestId('query-flyout-cancel-button'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Category E: rrule-mode override toggle
  // ─────────────────────────────────────────────────────────────────────────
  describe('rrule-mode override toggle', () => {
    beforeEach(() => {
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: true },
      });
    });

    afterEach(() => {
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: false },
      });
    });

    // E1 ────────────────────────────────────────────────────────────────────
    it('E1: should render the override toggle row when rruleScheduling flag is on and packSchedule is set', () => {
      renderFlyout({
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      // The ToggleableRow renders with dataTestSubj="osquery-query-override-pack-schedule"
      // The row wrapper gets the "-row" suffix.
      expect(screen.getByTestId('osquery-query-override-pack-schedule-row')).toBeInTheDocument();
    });

    // E2 ────────────────────────────────────────────────────────────────────
    it('E2: should show "Using pack schedule" label when override is off and packSchedule is set', () => {
      renderFlyout({
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      // The ToggleableRow row wrapper should be present
      expect(screen.getByTestId('osquery-query-override-pack-schedule-row')).toBeInTheDocument();

      // "Using pack schedule" helper text should be visible because override
      // is off by default (override_pack_schedule initializes to false)
      expect(screen.getByTestId('osquery-using-pack-schedule')).toBeInTheDocument();
    });

    // E3 ────────────────────────────────────────────────────────────────────
    it('E3: should show ScheduleSection and hide "Using pack schedule" when override toggle is turned on', async () => {
      renderFlyout({
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      // Initially, the using-pack-schedule label is visible and ScheduleSection
      // is hidden (override_pack_schedule = false → ToggleableRow children hidden)
      expect(screen.getByTestId('osquery-using-pack-schedule')).toBeInTheDocument();
      expect(screen.queryByTestId('mocked-schedule-section')).not.toBeInTheDocument();

      // Click the EuiSwitch to enable the override toggle.
      // EuiSwitch renders as a button[role="switch"] with the data-test-subj.
      const overrideSwitch = screen.getByTestId('osquery-query-override-pack-schedule');
      act(() => {
        fireEvent.click(overrideSwitch);
      });

      await waitFor(() => {
        // After enabling the override, the ScheduleSection should appear
        expect(screen.getByTestId('mocked-schedule-section')).toBeInTheDocument();
        // The "Using pack schedule" label should be gone
        expect(screen.queryByTestId('osquery-using-pack-schedule')).not.toBeInTheDocument();
      });
    });

    // E4 ────────────────────────────────────────────────────────────────────
    it('E4: should call onSave with no schedule fields when override is off at submit', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onClose = jest.fn();

      renderFlyout({
        onSave,
        onClose,
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      // Override is off by default — confirm using-pack-schedule label is present
      expect(screen.getByTestId('osquery-using-pack-schedule')).toBeInTheDocument();

      // Fill in the required ID field
      const idInput = screen.getByRole('textbox', { name: /ID/i });
      fireEvent.change(idInput, { target: { value: 'no-override-query' } });

      // Submit the form
      fireEvent.click(screen.getByTestId('query-flyout-save-button'));

      await waitFor(() => expect(onSave).toHaveBeenCalled());

      const saved = onSave.mock.calls[0][0];
      // When override is off and pack owns the rrule schedule, the query
      // must NOT emit schedule fields — the serializer strips them.
      expect(saved).not.toHaveProperty('schedule_type');
      expect(saved).not.toHaveProperty('rrule_schedule');
      expect(saved).not.toHaveProperty('interval');
    });

    // E5 ────────────────────────────────────────────────────────────────────
    it('E5: blocks save when an override schedule is invalid (over-cap splay, review #5)', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onClose = jest.fn();

      // Pack schedule carries an over-cap (13h) splay. Turning the override on
      // copies it into the query's override schedule, which is then invalid.
      renderFlyout({
        onSave,
        onClose,
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
            splay: '13h',
          },
        },
      });

      // Turn the override on so the gate applies to the (invalid) schedule.
      const overrideSwitch = screen.getByTestId('osquery-query-override-pack-schedule');
      act(() => {
        fireEvent.click(overrideSwitch);
      });

      const idInput = screen.getByRole('textbox', { name: /ID/i });
      fireEvent.change(idInput, { target: { value: 'bad-override-query' } });

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));

      // The submit gate must abort — onSave is never called.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    // E6 ────────────────────────────────────────────────────────────────────
    it('E6: disables the TimeoutField when inheriting an rrule pack schedule (review #6)', () => {
      renderFlyout({
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      // Override is off by default → timeout is inherited from the rrule pack
      // schedule and the field must be disabled.
      expect(screen.getByTestId('timeout-input')).toBeDisabled();
    });
  });
});
