/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { RUN_QUOTA_ENGINE_IDS } from '../../../common';
import type { RunQuotaEnforcementResult } from '../../../common';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';
import type { RunQuotaService } from './run_quota_service';

/**
 * Reconciles engine pause state with current daily usage. Runs on a timer via
 * `run_quota_enforce`, so it must converge in both directions from any starting
 * state: pause engines that went over their limit, resume the ones that came
 * back under (day rollover, or an admin raising a limit).
 *
 * This is what makes the quotas *soft*: a run is never blocked at admission,
 * so in-flight and concurrent runs overshoot until the next pass. Hard,
 * admit-time limits belong to the Workflows engine — see `docs/run_quotas.md`.
 */
export const enforceRunQuotas = async ({
  request,
  runQuotaService,
  maintenanceService,
  logger,
  updatedBy,
}: {
  request: KibanaRequest;
  runQuotaService: RunQuotaService;
  maintenanceService: SignificantEventsMaintenanceService;
  logger: Logger;
  updatedBy?: string;
}): Promise<RunQuotaEnforcementResult> => {
  const quotas = await runQuotaService.getQuotas();

  // Usage reads as zero when `.workflows-executions` is unreachable, which would
  // look like "everything is within limit" and resume every quota-paused engine.
  // Skip the pass instead and reconcile on the next tick.
  if (quotas.usageUnavailable) {
    logger.warn('Skipping run-quota enforcement: workflow execution usage is unavailable');
    return { pausedEngines: [], resumedEngines: [], skipped: true };
  }

  const exhaustedEngines = new Set(
    quotas.groups.filter((group) => group.exhausted).map((group) => group.engine)
  );
  const overLimit = RUN_QUOTA_ENGINE_IDS.filter((engine) => exhaustedEngines.has(engine));
  // An engine is only back within limit when *every* one of its groups is —
  // `context` carries both `ki_extraction` and `memory`.
  const withinLimit = RUN_QUOTA_ENGINE_IDS.filter((engine) => !exhaustedEngines.has(engine));

  if (overLimit.length > 0) {
    await maintenanceService.pause({
      request,
      updatedBy,
      engines: [...overLimit],
      reason: 'run_quota',
    });
  }

  // Only engines this same mechanism paused are resumed: a user pause records
  // `reason: 'user'` and is left alone.
  if (withinLimit.length > 0) {
    await maintenanceService.resume({
      request,
      updatedBy,
      engines: [...withinLimit],
      reasons: ['run_quota'],
    });
  }

  return {
    pausedEngines: [...overLimit],
    resumedEngines: [...withinLimit],
    skipped: false,
  };
};
