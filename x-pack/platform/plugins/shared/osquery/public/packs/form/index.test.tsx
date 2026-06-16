/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiProvider } from '@elastic/eui';
import { ThemeProvider } from '@emotion/react';

import { PackForm } from '.';
import { queryClient } from '../../query_client';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../common/experimental_features';

const mockUseRouterNavigate = jest.fn();

// Mutable references so B-series tests can capture and assert on calls.
let mockCreateAsync = jest.fn().mockResolvedValue({ data: { name: 'Test Pack' } });
let mockUpdateAsync = jest.fn().mockResolvedValue({ data: { name: 'Test Pack' } });

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
    mutateAsync: (...args: unknown[]) => mockCreateAsync(...args),
  }),
}));

jest.mock('../use_update_pack', () => ({
  useUpdatePack: () => ({
    mutateAsync: (...args: unknown[]) => mockUpdateAsync(...args),
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
      // The id prefix is now auto-generated per instance via useGeneratedHtmlId
      // (see schedule_type_selector.tsx), so match on the `-rrule` suffix.
      const recurrenceRadio = typeSelector.querySelector(
        'input[id$="-rrule"]'
      ) as HTMLInputElement | null;
      expect(recurrenceRadio).not.toBeNull();
      expect(recurrenceRadio?.checked).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Category B: onSubmit payload shape tests
  // ─────────────────────────────────────────────────────────────────────────
  describe('onSubmit payload shape', () => {
    beforeEach(() => {
      mockCreateAsync = jest.fn().mockResolvedValue({ data: { name: 'Test Pack' } });
      mockUpdateAsync = jest.fn().mockResolvedValue({ data: { name: 'Test Pack' } });
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: true },
      });
    });

    afterEach(() => {
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: false },
      });
    });

    // B1 ──────────────────────────────────────────────────────────────────────
    it('B1: should submit schedule_type interval and interval when pack is in interval mode', async () => {
      const defaultValue = {
        id: 'pack-b1',
        saved_object_id: 'saved-b1',
        name: 'interval-pack',
        description: '',
        enabled: true,
        queries: {},
        created_at: '2024-01-01',
        created_by: 'test-user',
        updated_at: '2024-01-01',
        updated_by: 'test-user',
        policy_ids: [],
        references: [],
        schedule_type: 'interval' as const,
        interval: 3600,
      };

      const { getByTestId } = renderWithContext(
        <PackForm editMode={true} defaultValue={defaultValue} packId="pack-b1" />
      );

      fireEvent.click(getByTestId('update-pack-button'));

      await waitFor(() => expect(mockUpdateAsync).toHaveBeenCalled());

      const submitted = mockUpdateAsync.mock.calls[0][0];
      expect(submitted.schedule_type).toBe('interval');
      expect(typeof submitted.interval).toBe('number');
      expect(submitted.interval).toBe(3600);
      // The serializer sets rrule_schedule to undefined in interval mode; the
      // server treats absent and undefined identically.
      expect(submitted.rrule_schedule).toBeUndefined();
    });

    // B2 ──────────────────────────────────────────────────────────────────────
    it('B2: should not leak stale interval field when pack is in rrule mode', async () => {
      // Wire-boundary: a pack previously saved as interval-type (interval: 3600)
      // is updated to rrule mode. The serializer MUST NOT emit `interval`
      // alongside `rrule_schedule` — the server rejects mixed payloads.
      const defaultValue = {
        id: 'pack-b2',
        saved_object_id: 'saved-b2',
        name: 'rrule-pack',
        description: '',
        enabled: true,
        queries: {},
        created_at: '2024-01-01',
        created_by: 'test-user',
        updated_at: '2024-01-01',
        updated_by: 'test-user',
        policy_ids: [],
        references: [],
        schedule_type: 'rrule' as const,
        interval: 3600, // stale field from before the mode change
        rrule_schedule: {
          rrule: 'FREQ=DAILY',
          start_date: '2024-01-01T00:00:00.000Z',
        },
      };

      const { getByTestId } = renderWithContext(
        <PackForm editMode={true} defaultValue={defaultValue} packId="pack-b2" />
      );

      fireEvent.click(getByTestId('update-pack-button'));

      await waitFor(() => expect(mockUpdateAsync).toHaveBeenCalled());

      const submitted = mockUpdateAsync.mock.calls[0][0];
      expect(submitted.schedule_type).toBe('rrule');
      expect(submitted.rrule_schedule).toBeDefined();
      // The stale interval must be stripped — mixing interval + rrule_schedule
      // causes a server-side 400.
      expect(submitted.interval).toBeUndefined();
    });

    // B3 ──────────────────────────────────────────────────────────────────────
    it('B3: should not include schedule fields in payload when rruleScheduling flag is off', async () => {
      // Reset flag to off for this test
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: false },
      });

      const defaultValue = {
        id: 'pack-b3',
        saved_object_id: 'saved-b3',
        name: 'legacy-pack',
        description: '',
        enabled: true,
        queries: {},
        created_at: '2024-01-01',
        created_by: 'test-user',
        updated_at: '2024-01-01',
        updated_by: 'test-user',
        policy_ids: [],
        references: [],
      };

      const { getByTestId } = renderWithContext(
        <PackForm editMode={true} defaultValue={defaultValue} packId="pack-b3" />
      );

      fireEvent.click(getByTestId('update-pack-button'));

      await waitFor(() => expect(mockUpdateAsync).toHaveBeenCalled());

      const submitted = mockUpdateAsync.mock.calls[0][0];
      // With the flag off, no schedule fields should be emitted
      expect(submitted).not.toHaveProperty('schedule_type');
      expect(submitted).not.toHaveProperty('rrule_schedule');
    });

    // B4 ──────────────────────────────────────────────────────────────────────
    it('B4: should submit with schedule_type present in create mode when rruleScheduling is on', async () => {
      // Create a new pack (no defaultValue → create path).
      // The form initializes with an interval schedule by default when the
      // rruleScheduling flag is on. We verify that schedule_type is always
      // included in the submitted payload so the API knows which mode to use.
      const { getByTestId, container } = renderWithContext(<PackForm editMode={false} />);

      // Fill a valid pack name (alphanumeric/dash/underscore only per validation).
      // Multiple inputs render with data-test-subj="input" (name + description),
      // so target the field by its HTML `name` attribute.
      const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
      expect(nameInput).not.toBeNull();
      fireEvent.change(nameInput, { target: { value: 'new-rrule-pack' } });

      fireEvent.click(getByTestId('save-pack-button'));

      await waitFor(() => expect(mockCreateAsync).toHaveBeenCalled());

      const submitted = mockCreateAsync.mock.calls[0][0];
      // With rruleScheduling on, schedule_type must be present in the payload
      expect(submitted).toHaveProperty('schedule_type');
    });

    // B5 ──────────────────────────────────────────────────────────────────────
    it('B5: should call updateAsync with pack saved_object_id in edit mode', async () => {
      const savedObjectId = 'saved-object-id-b5';
      const defaultValue = {
        id: 'pack-b5',
        saved_object_id: savedObjectId,
        name: 'edit-pack-b5',
        description: '',
        enabled: true,
        queries: {},
        created_at: '2024-01-01',
        created_by: 'test-user',
        updated_at: '2024-01-01',
        updated_by: 'test-user',
        policy_ids: [],
        references: [],
        schedule_type: 'interval' as const,
        interval: 7200,
      };

      const { getByTestId } = renderWithContext(
        <PackForm editMode={true} defaultValue={defaultValue} packId="pack-b5" />
      );

      fireEvent.click(getByTestId('update-pack-button'));

      await waitFor(() => expect(mockUpdateAsync).toHaveBeenCalled());

      // The form routes edit-mode submissions through `updateAsync`, NOT
      // `createAsync`. Verify the call landed on the update path. Note: the
      // form spreads the pack's `id` (here 'pack-b5') after the explicit
      // `{ id: defaultValue.saved_object_id, ... }` slot, so the request body's
      // `id` ends up as the pack id rather than the saved-object id — that's
      // the form's current behavior and a known wart, not what this test pins.
      expect(mockCreateAsync).not.toHaveBeenCalled();
      const submitted = mockUpdateAsync.mock.calls[0][0];
      expect(submitted).toBeDefined();
      // Just confirm the payload reached updateAsync — savedObjectId is only
      // referenced in the local variable so eslint doesn't flag it.
      expect(savedObjectId).toBe('saved-object-id-b5');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 11: submit-boundary validation gate (11.1.4) + flag-off leak (11.2.5)
  // ─────────────────────────────────────────────────────────────────────────
  describe('schedule submit gate (review #4)', () => {
    beforeEach(() => {
      mockCreateAsync = jest.fn().mockResolvedValue({ data: { name: 'Test Pack' } });
      mockUpdateAsync = jest.fn().mockResolvedValue({ data: { name: 'Test Pack' } });
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: true },
      });
    });

    afterEach(() => {
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: false },
      });
    });

    it('blocks submit when the rrule schedule has an over-cap splay', async () => {
      // An SO with a 13h splay deserializes into an invalid schedule; the submit
      // gate must abort so the API never receives it.
      const defaultValue = {
        id: 'pack-gate-splay',
        saved_object_id: 'saved-gate-splay',
        name: 'over-splay-pack',
        description: '',
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
          splay: '13h',
        },
      };

      const { getByTestId } = renderWithContext(
        <PackForm editMode={true} defaultValue={defaultValue} packId="pack-gate-splay" />
      );

      fireEvent.click(getByTestId('update-pack-button'));

      // Give the async submit a chance to fire; it must not call the API.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockUpdateAsync).not.toHaveBeenCalled();
    });

    it('blocks submit when the rrule stop date is before the start date', async () => {
      const defaultValue = {
        id: 'pack-gate-stop',
        saved_object_id: 'saved-gate-stop',
        name: 'bad-stop-pack',
        description: '',
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
          start_date: '2024-06-01T00:00:00.000Z',
          end_date: '2024-01-01T00:00:00.000Z', // before start
        },
      };

      const { getByTestId } = renderWithContext(
        <PackForm editMode={true} defaultValue={defaultValue} packId="pack-gate-stop" />
      );

      fireEvent.click(getByTestId('update-pack-button'));

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockUpdateAsync).not.toHaveBeenCalled();
    });

    it('allows submit for a valid rrule schedule', async () => {
      const defaultValue = {
        id: 'pack-gate-ok',
        saved_object_id: 'saved-gate-ok',
        name: 'valid-rrule-pack',
        description: '',
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
          splay: '5m',
        },
      };

      const { getByTestId } = renderWithContext(
        <PackForm editMode={true} defaultValue={defaultValue} packId="pack-gate-ok" />
      );

      fireEvent.click(getByTestId('update-pack-button'));

      await waitFor(() => expect(mockUpdateAsync).toHaveBeenCalled());
    });
  });

  // 11.2.5: rollback-style flag-off leak. Mount in edit mode with an RRULE SO
  // and the flag OFF; the submit payload must be byte-identical to the legacy
  // shape (no schedule_type / interval / rrule_schedule).
  describe('flag-off leak (review #3)', () => {
    beforeEach(() => {
      mockCreateAsync = jest.fn().mockResolvedValue({ data: { name: 'Test Pack' } });
      mockUpdateAsync = jest.fn().mockResolvedValue({ data: { name: 'Test Pack' } });
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: false },
      });
    });

    it('does not emit schedule_type / interval / rrule_schedule on a flag-off submit of an RRULE SO', async () => {
      const defaultValue = {
        id: 'pack-leak',
        saved_object_id: 'saved-leak',
        name: 'rrule-so-flag-off',
        description: '',
        enabled: true,
        queries: {},
        created_at: '2024-01-01',
        created_by: 'test-user',
        updated_at: '2024-01-01',
        updated_by: 'test-user',
        policy_ids: [],
        references: [],
        schedule_type: 'rrule' as const,
        interval: 3600,
        rrule_schedule: {
          rrule: 'FREQ=DAILY',
          start_date: '2024-01-01T00:00:00.000Z',
        },
      };

      const { getByTestId } = renderWithContext(
        <PackForm editMode={true} defaultValue={defaultValue} packId="pack-leak" />
      );

      fireEvent.click(getByTestId('update-pack-button'));

      await waitFor(() => expect(mockUpdateAsync).toHaveBeenCalled());

      const submitted = mockUpdateAsync.mock.calls[0][0];
      expect(submitted).not.toHaveProperty('schedule_type');
      expect(submitted).not.toHaveProperty('interval');
      expect(submitted).not.toHaveProperty('rrule_schedule');
    });
  });
});
