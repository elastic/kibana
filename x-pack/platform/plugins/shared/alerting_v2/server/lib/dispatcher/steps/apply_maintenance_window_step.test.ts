/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActiveMaintenanceWindow,
  MaintenanceWindowServiceContract,
} from '../../services/maintenance_window_service/maintenance_window_service';
import { createMaintenanceWindowServiceMock } from '../../services/maintenance_window_service/maintenance_window_service.mock';
import { ApplyMaintenanceWindowStep } from './apply_maintenance_window_step';
import {
  createAlertEpisode,
  createDispatcherPipelineInput,
  createDispatcherPipelineState,
  createRule,
} from '../fixtures/test_utils';

const buildMw = (overrides: Partial<ActiveMaintenanceWindow> = {}): ActiveMaintenanceWindow => ({
  id: 'mw-1',
  spaceId: 'default',
  enabled: true,
  events: [{ gte: '2026-01-22T07:00:00.000Z', lte: '2026-01-22T08:00:00.000Z' }],
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
    expect(service.getActiveMaintenanceWindows).not.toHaveBeenCalled();
  });

  it('returns continue with no data when there are no active maintenance windows', async () => {
    service.getActiveMaintenanceWindows.mockResolvedValue([]);

    const state = createDispatcherPipelineState({
      dispatchable: [createAlertEpisode()],
      rules: new Map([['rule-1', createRule()]]),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
  });

  it('keeps episodes whose rule is in a different space than active MW', async () => {
    service.getActiveMaintenanceWindows.mockResolvedValue([buildMw({ spaceId: 'other-space' })]);

    const ep = createAlertEpisode();
    const state = createDispatcherPipelineState({
      dispatchable: [ep],
      rules: new Map([[ep.rule_id, createRule({ id: ep.rule_id, spaceId: 'default' })]]),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
  });

  it('suppresses episodes inside the schedule window with no episode-data filter', async () => {
    service.getActiveMaintenanceWindows.mockResolvedValue([buildMw()]);

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
    service.getActiveMaintenanceWindows.mockResolvedValue([buildMw()]);

    const ep = createAlertEpisode({ last_event_timestamp: '2026-01-22T09:00:00.000Z' });
    const state = createDispatcherPipelineState({
      dispatchable: [ep],
      rules: new Map([[ep.rule_id, createRule({ id: ep.rule_id, spaceId: 'default' })]]),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
  });

  it('suppresses episodes where the episode-data KQL filter matches', async () => {
    service.getActiveMaintenanceWindows.mockResolvedValue([
      buildMw({
        scope: { episodes: { kql: 'data.severity: "critical"', filters: [], dsl: '' } },
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
    service.getActiveMaintenanceWindows.mockResolvedValue([
      buildMw({
        scope: { episodes: { kql: 'data.severity: "critical"', filters: [], dsl: '' } },
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
    service.getActiveMaintenanceWindows.mockResolvedValue([
      buildMw({
        id: 'mw-non-matching',
        scope: { episodes: { kql: 'data.severity: "low"', filters: [], dsl: '' } },
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
    service.getActiveMaintenanceWindows.mockResolvedValue([buildMw()]);

    const ep = createAlertEpisode({ last_event_timestamp: '2026-01-22T07:30:00.000Z' });
    const state = createDispatcherPipelineState({
      dispatchable: [ep],
      rules: new Map(),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
  });

  it('appends to existing suppressed array rather than overwriting it', async () => {
    service.getActiveMaintenanceWindows.mockResolvedValue([buildMw()]);

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

  it('queries for active maintenance windows using state.input.startedAt', async () => {
    service.getActiveMaintenanceWindows.mockResolvedValue([]);

    const startedAt = new Date('2026-01-22T07:45:00.000Z');
    const state = createDispatcherPipelineState({
      input: createDispatcherPipelineInput({ startedAt }),
      dispatchable: [createAlertEpisode()],
      rules: new Map([['rule-1', createRule()]]),
    });

    await step.execute(state);

    expect(service.getActiveMaintenanceWindows).toHaveBeenCalledWith(startedAt);
  });
});
