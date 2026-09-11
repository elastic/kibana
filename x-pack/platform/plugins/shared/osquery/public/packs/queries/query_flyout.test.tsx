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
const mockAddDanger = jest.fn();
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
      notifications: { toasts: { addDanger: mockAddDanger } },
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
  ScheduleSection: ({
    value,
    disabled,
  }: {
    value: Record<string, unknown>;
    disabled?: boolean;
  }) => (
    <div data-test-subj="mocked-schedule-section" data-disabled={String(!!disabled)}>
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

    it('should render the override toggle row when rruleScheduling flag is on and packSchedule is set', () => {
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

    it('should show "Using pack schedule" label when override is off and packSchedule is set', () => {
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

    it('should render ScheduleSection disabled when override is off, then enable it when toggled on', async () => {
      renderFlyout({
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      // Initially, the using-pack-schedule label is visible and the inherited
      // ScheduleSection renders read-only (disabled) so the user can see what
      // they inherit.
      expect(screen.getByTestId('osquery-using-pack-schedule')).toBeInTheDocument();
      expect(screen.getByTestId('mocked-schedule-section')).toHaveAttribute(
        'data-disabled',
        'true'
      );

      // Click the EuiSwitch to enable the override toggle.
      // EuiSwitch renders as a button[role="switch"] with the data-test-subj.
      const overrideSwitch = screen.getByTestId('osquery-query-override-pack-schedule');
      act(() => {
        fireEvent.click(overrideSwitch);
      });

      await waitFor(() => {
        // After enabling the override, the ScheduleSection becomes editable.
        expect(screen.getByTestId('mocked-schedule-section')).toHaveAttribute(
          'data-disabled',
          'false'
        );
        // The "Using pack schedule" label should be gone
        expect(screen.queryByTestId('osquery-using-pack-schedule')).not.toBeInTheDocument();
      });
    });

    it('should call onSave with no schedule fields when override is off at submit', async () => {
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

    // An invalid override keeps the Save button enabled but clicking it fires a
    // danger toast and never saves (this subsumes the bare not-saved assertion).
    it('shows a danger toast and blocks save for an invalid override schedule', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);

      renderFlyout({
        onSave,
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
            splay: '13h', // over-cap
          },
        },
      });

      // Turn the override on so the (invalid) schedule is gated.
      act(() => {
        fireEvent.click(screen.getByTestId('osquery-query-override-pack-schedule'));
      });

      // The Save button stays enabled — the gate is a toast on click.
      await waitFor(() => {
        expect(screen.getByTestId('query-flyout-save-button')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));
      await waitFor(() => expect(mockAddDanger).toHaveBeenCalled());
      expect(onSave).not.toHaveBeenCalled();
    });

    it('a valid override schedule saves with no error toast', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);

      renderFlyout({
        onSave,
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      act(() => {
        fireEvent.click(screen.getByTestId('osquery-query-override-pack-schedule'));
      });

      const idInput = screen.getByRole('textbox', { name: /ID/i });
      fireEvent.change(idInput, { target: { value: 'valid-override-query' } });

      expect(screen.getByTestId('query-flyout-save-button')).not.toBeDisabled();

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));
      await waitFor(() => expect(onSave).toHaveBeenCalled());
      expect(mockAddDanger).not.toHaveBeenCalled();
    });

    it('flag-off parity — no schedule gate, save proceeds with no error toast', async () => {
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: false },
      });
      const onSave = jest.fn().mockResolvedValue(undefined);

      renderFlyout({ onSave });

      const idInput = screen.getByRole('textbox', { name: /ID/i });
      fireEvent.change(idInput, { target: { value: 'flag-off-query' } });

      expect(screen.getByTestId('query-flyout-save-button')).not.toBeDisabled();

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));
      await waitFor(() => expect(onSave).toHaveBeenCalled());
      expect(mockAddDanger).not.toHaveBeenCalled();
    });

    // Child mode resync: flipping the parent pack mode re-seeds an inherited
    // (override-off) flyout's displayed schedule to the new mode; an active
    // override edit is preserved; no render loop (effect keyed on incoming mode).
    it('re-seeds an inherited flyout schedule when the pack mode flips', async () => {
      const { rerender } = renderFlyout({
        packSchedule: { schedule_type: 'interval', interval: 3600 },
      });

      // Inherited (override-off): the ScheduleSection renders disabled and
      // reflects the inherited interval mode.
      expect(screen.getByTestId('mocked-schedule-section')).toHaveAttribute(
        'data-disabled',
        'true'
      );
      expect(screen.getByTestId('mocked-schedule-section')).toHaveTextContent('interval');

      // Flip the pack mode to rrule (simulates the pack form switching modes
      // while the flyout is open). The guarded effect re-seeds the inherited
      // schedule to the new mode.
      rerender(
        <EuiProvider>
          <IntlProvider locale="en">
            <QueryFlyout
              uniqueQueryIds={[]}
              onSave={jest.fn()}
              onClose={jest.fn()}
              packSchedule={{
                schedule_type: 'rrule',
                rrule_schedule: {
                  rrule: 'FREQ=DAILY',
                  start_date: '2024-01-01T00:00:00.000Z',
                },
              }}
            />
          </IntlProvider>
        </EuiProvider>
      );

      // Reveal the re-seeded schedule by turning the override on; it now
      // reflects the new pack mode (rrule), proving the re-seed fired.
      act(() => {
        fireEvent.click(screen.getByTestId('osquery-query-override-pack-schedule'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('mocked-schedule-section')).toHaveTextContent('rrule');
      });
    });

    it('preserves an active override edit when the pack mode flips', async () => {
      const { rerender } = renderFlyout({
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      // Turn the override on — now the user is actively editing the override.
      act(() => {
        fireEvent.click(screen.getByTestId('osquery-query-override-pack-schedule'));
      });
      await waitFor(() =>
        expect(screen.getByTestId('mocked-schedule-section')).toBeInTheDocument()
      );

      // Flip the pack mode. The active override must NOT be re-seeded.
      rerender(
        <EuiProvider>
          <IntlProvider locale="en">
            <QueryFlyout
              uniqueQueryIds={[]}
              onSave={jest.fn()}
              onClose={jest.fn()}
              packSchedule={{ schedule_type: 'interval', interval: 3600 }}
            />
          </IntlProvider>
        </EuiProvider>
      );

      // The override schedule stays in its edited (rrule) mode — not reset to
      // the new pack mode.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(screen.getByTestId('mocked-schedule-section')).toHaveTextContent('rrule');
    });

    // Timeout is stripped from the wire for any rrule-mode query, so the control
    // must be disabled whether the query inherits the rrule pack schedule or
    // actively overrides it (still locked to rrule mode).
    it('disables the TimeoutField when inheriting an rrule pack schedule', () => {
      renderFlyout({
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      // Override off → inherits the rrule pack schedule; the field is disabled.
      expect(screen.getByTestId('timeout-input')).toBeDisabled();
    });

    it('keeps the TimeoutField disabled when overriding an rrule pack schedule', async () => {
      renderFlyout({
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      // Turn the override on — the schedule is locked to rrule mode, so the
      // timeout is still dropped on save and the field must stay disabled.
      act(() => {
        fireEvent.click(screen.getByTestId('osquery-query-override-pack-schedule'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('timeout-input')).toBeDisabled();
      });
    });

    describe('inherited ScheduleSection', () => {
      it('does not surface a validation toast while inheriting an invalid pack schedule', async () => {
        const onSave = jest.fn().mockResolvedValue(undefined);

        // Pack carries an over-cap (13h) splay. While inherited (override off),
        // the disabled fields must NOT trigger validation or block save.
        renderFlyout({
          onSave,
          packSchedule: {
            schedule_type: 'rrule',
            rrule_schedule: {
              rrule: 'FREQ=DAILY',
              start_date: '2024-01-01T00:00:00.000Z',
              splay: '13h',
            },
          },
        });

        const idInput = screen.getByRole('textbox', { name: /ID/i });
        fireEvent.change(idInput, { target: { value: 'inherited-invalid-query' } });

        fireEvent.click(screen.getByTestId('query-flyout-save-button'));

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(mockAddDanger).not.toHaveBeenCalled();
      });
    });

    describe('legacy interval inheritance (elastic/kibana#277700)', () => {
      it('shows and saves a legacy non-override query own interval, not the synthesized pack default', async () => {
        const onSave = jest.fn().mockResolvedValue(undefined);

        renderFlyout({
          onSave,
          uniqueQueryIds: ['legacy-query'],
          defaultValue: {
            id: 'legacy-query',
            query: 'select * from uptime;',
            interval: '80',
            shards: {},
          },
          // Legacy pack: synthesized interval default, no hasExplicitSchedule.
          packSchedule: { schedule_type: 'interval', interval: 3600 },
        });

        // Override stays off — the query defers to the pack, but its own
        // interval must NOT be overwritten by the synthesized default.
        expect(screen.getByTestId('osquery-using-pack-schedule')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('query-flyout-save-button'));

        await waitFor(() => expect(onSave).toHaveBeenCalled());

        const saved = onSave.mock.calls[0][0];
        expect(saved.interval).toBe('80');
        expect(saved.interval).not.toBe('3600');
        expect(saved).not.toHaveProperty('schedule_type');
      });

      it('inherits (strips) the interval for a non-override query when the pack schedule is explicit', async () => {
        const onSave = jest.fn().mockResolvedValue(undefined);

        renderFlyout({
          onSave,
          uniqueQueryIds: ['inherit-query'],
          defaultValue: {
            id: 'inherit-query',
            query: 'select * from uptime;',
            interval: '80',
            shards: {},
          },
          // Real pack-level interval schedule → the query inherits it and emits
          // no per-query interval.
          packSchedule: { schedule_type: 'interval', interval: 3600, hasExplicitSchedule: true },
        });

        fireEvent.click(screen.getByTestId('query-flyout-save-button'));

        await waitFor(() => expect(onSave).toHaveBeenCalled());

        const saved = onSave.mock.calls[0][0];
        expect(saved).not.toHaveProperty('interval');
        expect(saved).not.toHaveProperty('schedule_type');
      });
    });
  });

  describe('V5: consolidated pack-defaults override toggle', () => {
    it('hides the override toggle when the pack has no execution defaults', () => {
      renderFlyout({ uniqueQueryIds: [] });
      expect(screen.queryByTestId('osquery-query-override-pack-defaults')).not.toBeInTheDocument();
    });

    it('shows a single override toggle when the pack sets any default', () => {
      renderFlyout({ uniqueQueryIds: [], packMinOsqueryVersion: '5.10.0' });
      expect(screen.getByTestId('osquery-query-override-pack-defaults')).toBeInTheDocument();
      // The old per-field toggles are gone.
      expect(screen.queryByTestId('osquery-query-override-pack-version')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('osquery-query-override-pack-result-type')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('osquery-query-override-pack-platform')).not.toBeInTheDocument();
    });

    it('shows the toggle when only the pack result type is set', () => {
      renderFlyout({ uniqueQueryIds: [], packResultType: 'differential' });
      expect(screen.getByTestId('osquery-query-override-pack-defaults')).toBeInTheDocument();
    });

    it('shows the toggle when only the pack platform is set', () => {
      renderFlyout({ uniqueQueryIds: [], packPlatform: 'linux' });
      expect(screen.getByTestId('osquery-query-override-pack-defaults')).toBeInTheDocument();
    });

    it('strips every execution default when the toggle is off', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      renderFlyout({
        onSave,
        uniqueQueryIds: ['q1'],
        packMinOsqueryVersion: '5.10.0',
        packPlatform: 'linux',
        defaultValue: {
          id: 'q1',
          query: 'select 1;',
          interval: '3600',
          shards: {},
          version: '5.12.0',
        },
      });

      // A stored per-query version means the toggle starts ON.
      const toggle = screen.getByTestId('osquery-query-override-pack-defaults');
      expect(toggle).toBeChecked();

      act(() => {
        fireEvent.click(toggle);
      });
      expect(toggle).not.toBeChecked();

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));
      await waitFor(() => expect(onSave).toHaveBeenCalled());

      const saved = onSave.mock.calls[0][0];
      // The pack defaults both of these, so turning the toggle off makes the
      // query inherit them.
      expect(saved).not.toHaveProperty('version');
      expect(saved).not.toHaveProperty('platform');
    });

    // Regression: the override-off branch used to delete `version`,
    // `result_type` and `platform` unconditionally, while only the
    // snapshot/removed delete was gated on the matching pack default. Because
    // the toggle is shown when *any* pack default is set, turning it off wiped
    // per-query values for fields the pack had no default for — the query
    // inherited nothing and silently lost its own setting.
    it('should keep a per-query value for a field the pack does not default when the toggle is off', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      renderFlyout({
        onSave,
        uniqueQueryIds: ['q1'],
        // Only a result-type default: version and platform are NOT defaulted.
        packResultType: 'snapshot',
        defaultValue: {
          id: 'q1',
          query: 'select 1;',
          interval: '3600',
          shards: {},
          version: '5.12.0',
          platform: 'windows',
        },
      });

      // The query stores its own version and platform, so the toggle starts ON.
      const toggle = screen.getByTestId('osquery-query-override-pack-defaults');
      expect(toggle).toBeChecked();

      act(() => {
        fireEvent.click(toggle);
      });
      expect(toggle).not.toBeChecked();

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));
      await waitFor(() => expect(onSave).toHaveBeenCalled());

      const saved = onSave.mock.calls[0][0];
      // The pack defaults neither of these, so the query's own values survive.
      expect(saved.version).toBe('5.12.0');
      expect(saved.platform).toBe('windows');
      // The pack does default the result type, so that one is inherited.
      expect(saved).not.toHaveProperty('result_type');
    });

    it('emits a per-query value that differs from the pack default', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      renderFlyout({
        onSave,
        uniqueQueryIds: ['q2'],
        packMinOsqueryVersion: '5.10.0',
        defaultValue: {
          id: 'q2',
          query: 'select 1;',
          interval: '3600',
          shards: {},
          version: '5.12.0',
        },
      });

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));
      await waitFor(() => expect(onSave).toHaveBeenCalled());

      expect(onSave.mock.calls[0][0].version).toBe('5.12.0');
    });

    // The point of "emit only what differs": a query overriding one field
    // keeps inheriting the others, so later pack-level changes still reach it.
    it('does not emit a per-query value equal to the pack default', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      renderFlyout({
        onSave,
        uniqueQueryIds: ['q3'],
        packMinOsqueryVersion: '5.10.0',
        packPlatform: 'linux',
        defaultValue: {
          id: 'q3',
          query: 'select 1;',
          interval: '3600',
          shards: {},
          // Matches the pack default exactly.
          version: '5.10.0',
          platform: 'windows',
        },
      });

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));
      await waitFor(() => expect(onSave).toHaveBeenCalled());

      const saved = onSave.mock.calls[0][0];
      expect(saved).not.toHaveProperty('version');
      expect(saved.platform).toBe('windows');
    });

    // Regression: with the toggle ON, the serializer deleted `result_type` when
    // it matched the pack default but left the seeded `snapshot`/`removed` pair
    // behind. The server decodes that pair as an explicit per-query override, so
    // a later pack-level result-type change would never reach this query — the
    // opposite of the inheritance this branch is supposed to preserve.
    it('does not leak seeded snapshot/removed when overriding only another field', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      renderFlyout({
        onSave,
        uniqueQueryIds: ['q4'],
        packResultType: 'differential',
        packPlatform: 'linux',
        defaultValue: {
          id: 'q4',
          query: 'select 1;',
          interval: '3600',
          shards: {},
          // Overrides the OS only, so the toggle is ON while the result type
          // is still inherited from the pack.
          platform: 'windows',
        },
      });

      const toggle = screen.getByTestId('osquery-query-override-pack-defaults');
      expect(toggle).toBeChecked();

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));
      await waitFor(() => expect(onSave).toHaveBeenCalled());

      const saved = onSave.mock.calls[0][0];
      // The real override survives.
      expect(saved.platform).toBe('windows');
      // The inherited result type leaves nothing behind, in any encoding.
      expect(saved).not.toHaveProperty('result_type');
      expect(saved).not.toHaveProperty('snapshot');
      expect(saved).not.toHaveProperty('removed');
    });

    // Seeding the inherited result type also writes the `snapshot`/`removed`
    // booleans the field reads. Those must not leak to the wire for an
    // inheriting query — the pack default already fans out server-side.
    it('does not leak seeded snapshot/removed booleans for an inheriting query', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      renderFlyout({
        onSave,
        uniqueQueryIds: ['q4'],
        packResultType: 'differential',
        defaultValue: {
          id: 'q4',
          query: 'select 1;',
          interval: '3600',
          shards: {},
        },
      });

      // No stored per-query value → toggle OFF → fully inheriting.
      expect(screen.getByTestId('osquery-query-override-pack-defaults')).not.toBeChecked();

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));
      await waitFor(() => expect(onSave).toHaveBeenCalled());

      const saved = onSave.mock.calls[0][0];
      expect(saved).not.toHaveProperty('result_type');
      expect(saved).not.toHaveProperty('snapshot');
      expect(saved).not.toHaveProperty('removed');
    });
  });
});
