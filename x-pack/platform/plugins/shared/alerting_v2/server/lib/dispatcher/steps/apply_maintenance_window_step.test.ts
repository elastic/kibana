/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindowServiceContract } from '../../services/maintenance_window_service/maintenance_window_service';
import { createMaintenanceWindowServiceMock } from '../../services/maintenance_window_service/maintenance_window_service.mock';
import { ApplyMaintenanceWindowStep } from './apply_maintenance_window_step';
import {
  createAlert,
  createDispatcherPipelineInput,
  createDispatcherPipelineState,
  createRule,
  createStepLogger,
} from '../fixtures/test_utils';
import type { ActiveMaintenanceWindow } from '../../services/maintenance_window_service/types';

const logger = createStepLogger();

const buildMw = (overrides: Partial<ActiveMaintenanceWindow> = {}): ActiveMaintenanceWindow => ({
  id: 'mw-1',
  spaceId: 'default',
  events: [
    {
      gteMs: Date.parse('2026-01-22T07:00:00.000Z'),
      lteMs: Date.parse('2026-01-22T08:00:00.000Z'),
    },
  ],
  // Default: v2 selected, no filter — suppress all v2 alerts in the window.
  // Tests that need v2-not-selected must pass scope: {} or scope: undefined explicitly.
  scope: { alertingV2: { enabled: true } },
  ...overrides,
});

describe('ApplyMaintenanceWindowStep', () => {
  let service: jest.Mocked<MaintenanceWindowServiceContract>;
  let step: ApplyMaintenanceWindowStep;

  beforeEach(() => {
    service = createMaintenanceWindowServiceMock();
    step = new ApplyMaintenanceWindowStep(service);
  });

  it('returns continue with no data when there are no dispatchable alerts', async () => {
    const state = createDispatcherPipelineState({ dispatchable: [] });

    const result = await step.execute(state, logger);

    expect(result).toEqual({ type: 'continue' });
    expect(service.getEnabledMaintenanceWindows).not.toHaveBeenCalled();
  });

  it('returns continue with no data when there are no active maintenance windows', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([]);

    const state = createDispatcherPipelineState({
      dispatchable: [createAlert()],
      rules: new Map([['rule-1', createRule()]]),
    });

    const result = await step.execute(state, logger);

    expect(result).toEqual({ type: 'continue' });
  });

  it('keeps alerts whose rule is in a different space than active MW', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw({ spaceId: 'other-space' })]);

    const alert = createAlert();
    const state = createDispatcherPipelineState({
      dispatchable: [alert],
      rules: new Map([[alert.rule_id!, createRule({ id: alert.rule_id!, spaceId: 'default' })]]),
    });

    const result = await step.execute(state, logger);

    expect(result).toEqual({ type: 'continue' });
  });

  it('suppresses alerts inside the schedule window with no alert-data filter', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw()]);

    const alert = createAlert({ last_event_timestamp: '2026-01-22T07:30:00.000Z' });
    const state = createDispatcherPipelineState({
      dispatchable: [alert],
      rules: new Map([[alert.rule_id!, createRule({ id: alert.rule_id!, spaceId: 'default' })]]),
      suppressed: [],
    });

    const result = await step.execute(state, logger);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.triage?.dispatchable).toHaveLength(0);
    expect(result.data?.triage?.suppressed).toHaveLength(1);
    expect(result.data?.triage?.suppressed[0]).toEqual(
      expect.objectContaining({ rule_id: alert.rule_id, reason: 'maintenance_window:mw-1' })
    );
  });

  it('keeps alerts outside the schedule window', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw()]);

    const alert = createAlert({ last_event_timestamp: '2026-01-22T09:00:00.000Z' });
    const state = createDispatcherPipelineState({
      dispatchable: [alert],
      rules: new Map([[alert.rule_id!, createRule({ id: alert.rule_id!, spaceId: 'default' })]]),
    });

    const result = await step.execute(state, logger);

    expect(result).toEqual({ type: 'continue' });
  });

  it('suppresses alerts where the alert-data KQL filter matches', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([
      buildMw({
        scope: { alertingV2: { enabled: true, kql: 'data.severity: "critical"' } },
      }),
    ]);

    const alert = createAlert({
      last_event_timestamp: '2026-01-22T07:30:00.000Z',
      data: { severity: 'critical' },
    });
    const state = createDispatcherPipelineState({
      dispatchable: [alert],
      rules: new Map([[alert.rule_id!, createRule({ id: alert.rule_id!, spaceId: 'default' })]]),
      suppressed: [],
    });

    const result = await step.execute(state, logger);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.triage?.suppressed).toHaveLength(1);
    expect(result.data?.triage?.dispatchable).toHaveLength(0);
  });

  it('keeps alerts where the alert-data KQL filter does not match', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([
      buildMw({
        scope: { alertingV2: { enabled: true, kql: 'data.severity: "critical"' } },
      }),
    ]);

    const alert = createAlert({
      last_event_timestamp: '2026-01-22T07:30:00.000Z',
      data: { severity: 'low' },
    });
    const state = createDispatcherPipelineState({
      dispatchable: [alert],
      rules: new Map([[alert.rule_id!, createRule({ id: alert.rule_id!, spaceId: 'default' })]]),
    });

    const result = await step.execute(state, logger);

    expect(result).toEqual({ type: 'continue' });
  });

  it.each([
    ['alert_id: "alert-1" and alert_status: active', 1],
    ['episode_id: "alert-1"', 0],
    ['episode_status: active', 0],
  ])('suppresses alerts matching the KQL filter %s: %i', async (kql, expectedSuppressed) => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([
      buildMw({ scope: { alertingV2: { enabled: true, kql } } }),
    ]);

    const alert = createAlert({
      last_event_timestamp: '2026-01-22T07:30:00.000Z',
      alert_id: 'alert-1',
      alert_status: 'active',
    });
    const state = createDispatcherPipelineState({
      dispatchable: [alert],
      rules: new Map([[alert.rule_id!, createRule({ id: alert.rule_id!, spaceId: 'default' })]]),
      suppressed: [],
    });

    const result = await step.execute(state, logger);
    const suppressed = result.type === 'continue' ? result.data?.triage?.suppressed ?? [] : [];

    expect(suppressed).toHaveLength(expectedSuppressed);
  });

  it('suppresses with the id of the first MW that matches when multiple MWs are in the same space', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([
      buildMw({
        id: 'mw-non-matching',
        scope: { alertingV2: { enabled: true, kql: 'data.severity: "low"' } },
      }),
      buildMw({ id: 'mw-matching' }),
    ]);

    const alert = createAlert({
      last_event_timestamp: '2026-01-22T07:30:00.000Z',
      data: { severity: 'critical' },
    });
    const state = createDispatcherPipelineState({
      dispatchable: [alert],
      rules: new Map([[alert.rule_id!, createRule({ id: alert.rule_id!, spaceId: 'default' })]]),
      suppressed: [],
    });

    const result = await step.execute(state, logger);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.triage?.suppressed[0]).toEqual(
      expect.objectContaining({ reason: 'maintenance_window:mw-matching' })
    );
  });

  it('passes through an internal alert whose rule is missing from the rules map (rule deleted)', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw()]);

    const alert = createAlert({
      last_event_timestamp: '2026-01-22T07:30:00.000Z',
      space_id: 'default',
    });
    const state = createDispatcherPipelineState({
      dispatchable: [alert],
      rules: new Map(),
      suppressed: [],
    });

    const result = await step.execute(state, logger);

    // Internal alerts with a deleted rule bypass MW; evaluate_matchers will skip them.
    expect(result).toEqual({ type: 'continue' });
  });

  it('appends to existing suppressed array rather than overwriting it', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw()]);

    const alert = createAlert({ last_event_timestamp: '2026-01-22T07:30:00.000Z' });
    const previouslySuppressed = {
      ...createAlert({ alert_id: 'previously-suppressed' }),
      reason: 'snooze',
    };
    const state = createDispatcherPipelineState({
      dispatchable: [alert],
      rules: new Map([[alert.rule_id!, createRule({ id: alert.rule_id!, spaceId: 'default' })]]),
      suppressed: [previouslySuppressed],
    });

    const result = await step.execute(state, logger);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.triage?.suppressed).toHaveLength(2);
    expect(result.data?.triage?.suppressed[0]).toEqual(previouslySuppressed);
  });

  it('suppresses an alert whose timestamp is inside an MW window that has already closed by now', async () => {
    // MW window 07:00–08:00 already closed by the dispatcher's startedAt (12:05),
    // but the alert fired at 07:30 — still inside the window, must be suppressed.
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw({ id: 'mw-closed' })]);

    const alert = createAlert({ last_event_timestamp: '2026-01-22T07:30:00.000Z' });
    const state = createDispatcherPipelineState({
      input: createDispatcherPipelineInput({ startedAt: new Date('2026-01-22T12:05:00.000Z') }),
      dispatchable: [alert],
      rules: new Map([[alert.rule_id!, createRule({ id: alert.rule_id!, spaceId: 'default' })]]),
      suppressed: [],
    });

    const result = await step.execute(state, logger);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.triage?.suppressed).toHaveLength(1);
    expect(result.data?.triage?.suppressed[0]).toEqual(
      expect.objectContaining({ reason: 'maintenance_window:mw-closed' })
    );
  });

  it('does not pass any timestamp to the service (per-alert matching is done in the step)', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([]);

    const state = createDispatcherPipelineState({
      input: createDispatcherPipelineInput({ startedAt: new Date('2026-01-22T07:45:00.000Z') }),
      dispatchable: [createAlert()],
      rules: new Map([['rule-1', createRule()]]),
    });

    await step.execute(state, logger);

    expect(service.getEnabledMaintenanceWindows).toHaveBeenCalledWith();
  });

  describe('external alert maintenance window matching', () => {
    it('suppresses an external alert in the same space as the MW (no rule KQL scope)', async () => {
      service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw({ spaceId: 'default' })]);

      const alert = createAlert({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'default',
        last_event_timestamp: '2026-01-22T07:30:00.000Z',
      });
      const state = createDispatcherPipelineState({
        dispatchable: [alert],
        rules: new Map(),
        suppressed: [],
      });

      const result = await step.execute(state, logger);

      if (result.type !== 'continue') throw new Error('expected continue');
      expect(result.data?.triage?.dispatchable).toHaveLength(0);
      expect(result.data?.triage?.suppressed).toHaveLength(1);
      expect(result.data?.triage?.suppressed[0]).toEqual(
        expect.objectContaining({ reason: 'maintenance_window:mw-1' })
      );
    });

    it('does not suppress an external alert when the MW is in a different space', async () => {
      service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw({ spaceId: 'other-space' })]);

      const alert = createAlert({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'default',
        last_event_timestamp: '2026-01-22T07:30:00.000Z',
      });
      const state = createDispatcherPipelineState({
        dispatchable: [alert],
        rules: new Map(),
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual({ type: 'continue' });
    });

    it('suppresses an external alert matched by a KQL-scoped MW against alert data', async () => {
      service.getEnabledMaintenanceWindows.mockResolvedValue([
        buildMw({
          spaceId: 'default',
          scope: { alertingV2: { enabled: true, kql: 'data.severity: "critical"' } },
        }),
      ]);

      const alert = createAlert({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'default',
        last_event_timestamp: '2026-01-22T07:30:00.000Z',
        data: { severity: 'critical' },
      });
      const state = createDispatcherPipelineState({
        dispatchable: [alert],
        rules: new Map(),
        suppressed: [],
      });

      const result = await step.execute(state, logger);

      if (result.type !== 'continue') throw new Error('expected continue');
      expect(result.data?.triage?.dispatchable).toHaveLength(0);
      expect(result.data?.triage?.suppressed).toHaveLength(1);
      expect(result.data?.triage?.suppressed[0]).toEqual(
        expect.objectContaining({ reason: 'maintenance_window:mw-1' })
      );
    });

    it('does not suppress an external alert when the KQL scope does not match', async () => {
      service.getEnabledMaintenanceWindows.mockResolvedValue([
        buildMw({
          spaceId: 'default',
          scope: { alertingV2: { enabled: true, kql: 'data.severity: "critical"' } },
        }),
      ]);

      const alert = createAlert({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'default',
        last_event_timestamp: '2026-01-22T07:30:00.000Z',
        data: { severity: 'low' },
      });
      const state = createDispatcherPipelineState({
        dispatchable: [alert],
        rules: new Map(),
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual({ type: 'continue' });
    });

    it('does not suppress an alert when the MW has no alertingV2 scope (v2 not selected)', async () => {
      // A MW with scope.alertingV2 absent means v2 not selected — must not suppress v2 alerts.
      service.getEnabledMaintenanceWindows.mockResolvedValue([
        buildMw({ spaceId: 'default', scope: {} }),
      ]);

      const alert = createAlert({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'default',
        last_event_timestamp: '2026-01-22T07:30:00.000Z',
      });
      const state = createDispatcherPipelineState({
        dispatchable: [alert],
        rules: new Map(),
      });

      const result = await step.execute(state, logger);

      // v2 not selected → no suppression
      expect(result).toEqual({ type: 'continue' });
    });
  });

  it('does not suppress an alert when the MW has no scope at all (v2 not selected)', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw({ scope: undefined })]);

    const alert = createAlert({ last_event_timestamp: '2026-01-22T07:30:00.000Z' });
    const state = createDispatcherPipelineState({
      dispatchable: [alert],
      rules: new Map([[alert.rule_id!, createRule({ id: alert.rule_id!, spaceId: 'default' })]]),
      suppressed: [],
    });

    const result = await step.execute(state, logger);

    // scope absent → alertingV2 absent → skip → no suppression
    expect(result).toEqual({ type: 'continue' });
  });
});
