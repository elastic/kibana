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
  createAlertEpisode,
  createDispatcherPipelineInput,
  createDispatcherPipelineState,
  createRule,
} from '../fixtures/test_utils';
import type { ActiveMaintenanceWindow } from '../../services/maintenance_window_service/types';

const buildMw = (overrides: Partial<ActiveMaintenanceWindow> = {}): ActiveMaintenanceWindow => ({
  id: 'mw-1',
  spaceId: 'default',
  events: [
    {
      gteMs: Date.parse('2026-01-22T07:00:00.000Z'),
      lteMs: Date.parse('2026-01-22T08:00:00.000Z'),
    },
  ],
  ...overrides,
});

describe('ApplyMaintenanceWindowStep', () => {
  let service: jest.Mocked<MaintenanceWindowServiceContract>;
  let step: ApplyMaintenanceWindowStep;

  beforeEach(() => {
    service = createMaintenanceWindowServiceMock();
    step = new ApplyMaintenanceWindowStep(service);
  });

  it('returns continue with no data when there are no dispatchable episodes', async () => {
    const state = createDispatcherPipelineState({ dispatchable: [] });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(service.getEnabledMaintenanceWindows).not.toHaveBeenCalled();
  });

  it('returns continue with no data when there are no active maintenance windows', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([]);

    const state = createDispatcherPipelineState({
      dispatchable: [createAlertEpisode()],
      rules: new Map([['rule-1', createRule()]]),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
  });

  it('keeps episodes whose rule is in a different space than active MW', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw({ spaceId: 'other-space' })]);

    const ep = createAlertEpisode();
    const state = createDispatcherPipelineState({
      dispatchable: [ep],
      rules: new Map([[ep.rule_id, createRule({ id: ep.rule_id, spaceId: 'default' })]]),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
  });

  it('suppresses episodes inside the schedule window with no episode-data filter', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw()]);

    const ep = createAlertEpisode({ last_event_timestamp: '2026-01-22T07:30:00.000Z' });
    const state = createDispatcherPipelineState({
      dispatchable: [ep],
      rules: new Map([[ep.rule_id, createRule({ id: ep.rule_id, spaceId: 'default' })]]),
      suppressed: [],
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.dispatchable).toHaveLength(0);
    expect(result.data?.suppressed).toHaveLength(1);
    expect(result.data?.suppressed?.[0]).toEqual(
      expect.objectContaining({ rule_id: ep.rule_id, reason: 'maintenance_window:mw-1' })
    );
  });

  it('keeps episodes outside the schedule window', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw()]);

    const ep = createAlertEpisode({ last_event_timestamp: '2026-01-22T09:00:00.000Z' });
    const state = createDispatcherPipelineState({
      dispatchable: [ep],
      rules: new Map([[ep.rule_id, createRule({ id: ep.rule_id, spaceId: 'default' })]]),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
  });

  it('suppresses episodes where the episode-data KQL filter matches', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([
      buildMw({
        scope: { alertingV2: { kql: 'data.severity: "critical"' } },
      }),
    ]);

    const ep = createAlertEpisode({
      last_event_timestamp: '2026-01-22T07:30:00.000Z',
      data: { severity: 'critical' },
    });
    const state = createDispatcherPipelineState({
      dispatchable: [ep],
      rules: new Map([[ep.rule_id, createRule({ id: ep.rule_id, spaceId: 'default' })]]),
      suppressed: [],
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.suppressed).toHaveLength(1);
    expect(result.data?.dispatchable).toHaveLength(0);
  });

  it('keeps episodes where the episode-data KQL filter does not match', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([
      buildMw({
        scope: { alertingV2: { kql: 'data.severity: "critical"' } },
      }),
    ]);

    const ep = createAlertEpisode({
      last_event_timestamp: '2026-01-22T07:30:00.000Z',
      data: { severity: 'low' },
    });
    const state = createDispatcherPipelineState({
      dispatchable: [ep],
      rules: new Map([[ep.rule_id, createRule({ id: ep.rule_id, spaceId: 'default' })]]),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
  });

  it('suppresses with the id of the first MW that matches when multiple MWs are in the same space', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([
      buildMw({
        id: 'mw-non-matching',
        scope: { alertingV2: { kql: 'data.severity: "low"' } },
      }),
      buildMw({ id: 'mw-matching' }),
    ]);

    const ep = createAlertEpisode({
      last_event_timestamp: '2026-01-22T07:30:00.000Z',
      data: { severity: 'critical' },
    });
    const state = createDispatcherPipelineState({
      dispatchable: [ep],
      rules: new Map([[ep.rule_id, createRule({ id: ep.rule_id, spaceId: 'default' })]]),
      suppressed: [],
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.suppressed?.[0]).toEqual(
      expect.objectContaining({ reason: 'maintenance_window:mw-matching' })
    );
  });

  it('keeps episodes when the rule is missing from the rules map', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw()]);

    const ep = createAlertEpisode({ last_event_timestamp: '2026-01-22T07:30:00.000Z' });
    const state = createDispatcherPipelineState({
      dispatchable: [ep],
      rules: new Map(),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
  });

  it('appends to existing suppressed array rather than overwriting it', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw()]);

    const ep = createAlertEpisode({ last_event_timestamp: '2026-01-22T07:30:00.000Z' });
    const previouslySuppressed = {
      ...createAlertEpisode({ episode_id: 'previously-suppressed' }),
      reason: 'snooze',
    };
    const state = createDispatcherPipelineState({
      dispatchable: [ep],
      rules: new Map([[ep.rule_id, createRule({ id: ep.rule_id, spaceId: 'default' })]]),
      suppressed: [previouslySuppressed],
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.suppressed).toHaveLength(2);
    expect(result.data?.suppressed?.[0]).toEqual(previouslySuppressed);
  });

  it('suppresses an episode whose timestamp is inside an MW window that has already closed by now', async () => {
    // MW window 07:00–08:00 already closed by the dispatcher's startedAt (12:05),
    // but the episode fired at 07:30 — still inside the window, must be suppressed.
    service.getEnabledMaintenanceWindows.mockResolvedValue([buildMw({ id: 'mw-closed' })]);

    const ep = createAlertEpisode({ last_event_timestamp: '2026-01-22T07:30:00.000Z' });
    const state = createDispatcherPipelineState({
      input: createDispatcherPipelineInput({ startedAt: new Date('2026-01-22T12:05:00.000Z') }),
      dispatchable: [ep],
      rules: new Map([[ep.rule_id, createRule({ id: ep.rule_id, spaceId: 'default' })]]),
      suppressed: [],
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.suppressed).toHaveLength(1);
    expect(result.data?.suppressed?.[0]).toEqual(
      expect.objectContaining({ reason: 'maintenance_window:mw-closed' })
    );
  });

  it('does not pass any timestamp to the service (per-episode matching is done in the step)', async () => {
    service.getEnabledMaintenanceWindows.mockResolvedValue([]);

    const state = createDispatcherPipelineState({
      input: createDispatcherPipelineInput({ startedAt: new Date('2026-01-22T07:45:00.000Z') }),
      dispatchable: [createAlertEpisode()],
      rules: new Map([['rule-1', createRule()]]),
    });

    await step.execute(state);

    expect(service.getEnabledMaintenanceWindows).toHaveBeenCalledWith();
  });
});
