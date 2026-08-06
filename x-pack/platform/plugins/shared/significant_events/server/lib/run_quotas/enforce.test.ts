/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  DEFAULT_RUN_QUOTA_SETTINGS,
  RUN_BUDGET_GROUP_ENGINE,
  RUN_BUDGET_GROUP_IDS,
  type RunBudgetGroupId,
  type RunQuotasResponse,
} from '../../../common';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';
import { enforceRunQuotas } from './enforce';
import type { RunQuotaService } from './run_quota_service';

const request = {} as KibanaRequest;

const quotasWith = ({
  exhaustedGroups = [],
  usageUnavailable = false,
}: {
  exhaustedGroups?: RunBudgetGroupId[];
  usageUnavailable?: boolean;
} = {}): RunQuotasResponse => ({
  settings: DEFAULT_RUN_QUOTA_SETTINGS,
  window: {
    start: '2026-08-06T00:00:00.000Z',
    resetsAt: '2026-08-07T00:00:00.000Z',
    timezone: 'UTC',
  },
  groups: RUN_BUDGET_GROUP_IDS.map((group) => ({
    group,
    engine: RUN_BUDGET_GROUP_ENGINE[group],
    limit: DEFAULT_RUN_QUOTA_SETTINGS.limits[group],
    used: exhaustedGroups.includes(group) ? DEFAULT_RUN_QUOTA_SETTINGS.limits[group].max : 0,
    remaining: exhaustedGroups.includes(group) ? 0 : DEFAULT_RUN_QUOTA_SETTINGS.limits[group].max,
    exhausted: exhaustedGroups.includes(group),
    byTrigger: {},
  })),
  usageUnavailable,
});

const createHarness = (quotas: RunQuotasResponse) => {
  const pause = jest.fn(async () => undefined);
  const resume = jest.fn(async () => undefined);
  const logger = loggerMock.create();

  const run = () =>
    enforceRunQuotas({
      request,
      logger,
      runQuotaService: { getQuotas: async () => quotas } as unknown as RunQuotaService,
      maintenanceService: { pause, resume } as unknown as SignificantEventsMaintenanceService,
    });

  return { run, pause, resume, logger };
};

describe('enforceRunQuotas', () => {
  it('pauses the engines of exhausted groups and resumes the rest', async () => {
    const { run, pause, resume } = createHarness(quotasWith({ exhaustedGroups: ['detection'] }));

    const result = await run();

    expect(result).toEqual({
      pausedEngines: ['detection'],
      resumedEngines: ['context', 'investigation'],
      skipped: false,
    });
    expect(pause).toHaveBeenCalledWith(
      expect.objectContaining({ engines: ['detection'], reason: 'run_quota' })
    );
    expect(resume).toHaveBeenCalledWith(
      expect.objectContaining({ engines: ['context', 'investigation'], reasons: ['run_quota'] })
    );
  });

  it('keeps an engine paused while any of its groups is over the limit', async () => {
    // `context` carries both ki_extraction and memory.
    const { run, pause, resume } = createHarness(quotasWith({ exhaustedGroups: ['memory'] }));

    const result = await run();

    expect(result.pausedEngines).toEqual(['context']);
    expect(result.resumedEngines).not.toContain('context');
    expect(pause).toHaveBeenCalledWith(expect.objectContaining({ engines: ['context'] }));
    expect(resume).toHaveBeenCalledWith(
      expect.objectContaining({ engines: ['detection', 'investigation'] })
    );
  });

  it('resumes every engine once nothing is over the limit', async () => {
    const { run, pause, resume } = createHarness(quotasWith());

    const result = await run();

    expect(result.pausedEngines).toEqual([]);
    expect(pause).not.toHaveBeenCalled();
    expect(resume).toHaveBeenCalledWith(
      expect.objectContaining({
        engines: ['context', 'detection', 'investigation'],
        reasons: ['run_quota'],
      })
    );
  });

  it('changes nothing when usage cannot be read', async () => {
    // Usage reads as zero, which must not be mistaken for "everything is idle".
    const { run, pause, resume, logger } = createHarness(quotasWith({ usageUnavailable: true }));

    const result = await run();

    expect(result).toEqual({ pausedEngines: [], resumedEngines: [], skipped: true });
    expect(pause).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});
