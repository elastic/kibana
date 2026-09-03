/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatcherContext } from '@kbn/alerting-v2-schemas';
import { evaluateKql } from '@kbn/eval-kql';
import { inject, injectable } from 'inversify';
import type { MaintenanceWindowServiceContract } from '../../services/maintenance_window_service/maintenance_window_service';
import { MaintenanceWindowServiceInternalToken } from '../../services/maintenance_window_service/tokens';
import type { ActiveMaintenanceWindow } from '../../services/maintenance_window_service/types';
import { EpisodeTriage, RuleCatalog } from '../state';
import type {
  AlertEpisode,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  Rule,
} from '../types';
import { createMatcherContext } from './utils/matcher_context';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';

/**
 * Suppresses episodes whose `last_event_timestamp` falls within an active
 * maintenance window in the same space, and whose `episode.data` matches the
 * maintenance window's optional episode-data KQL filter
 * (`scope.alertingV2.kql`, experimental).
 */
@injectable()
export class ApplyMaintenanceWindowStep implements DispatcherStep {
  public readonly name = 'apply_maintenance_window';

  constructor(
    @inject(MaintenanceWindowServiceInternalToken)
    private readonly maintenanceWindowService: MaintenanceWindowServiceContract
  ) {}

  public async execute(
    state: Readonly<DispatcherPipelineState>,
    _: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    const { triage = EpisodeTriage.empty(), rules = RuleCatalog.empty() } = state;
    if (!triage.hasDispatchable()) {
      return { type: 'continue' };
    }

    const enabledWindows = await this.maintenanceWindowService.getEnabledMaintenanceWindows();
    if (enabledWindows.length === 0) {
      return { type: 'continue' };
    }

    const windowsBySpace = Map.groupBy(enabledWindows, (mw) => mw.spaceId);

    const newTriage = triage.suppressDispatchableWhere((episode) => {
      // Orphaned internal episodes bypass MW so that the evaluate_matchers guard
      // (not MW suppression) is the reason they never dispatch — preserving pre-PR behavior.
      if (rules.isOrphanedInternalEpisode(episode)) {
        return undefined;
      }
      const candidates = windowsBySpace.get(episode.space_id);
      if (!candidates) {
        return undefined;
      }

      const maintenanceWindow = findMatchingMaintenanceWindow(
        candidates,
        episode,
        rules.forEpisode(episode)
      );
      return maintenanceWindow ? maintenanceWindowReason(maintenanceWindow.id) : undefined;
    });

    if (newTriage === triage) {
      // Nothing newly suppressed — no state to emit.
      return { type: 'continue' };
    }

    return { type: 'continue', data: { triage: newTriage } };
  }
}

export const MAINTENANCE_WINDOW_REASON_PREFIX = 'maintenance_window';
const maintenanceWindowReason = (id: string) => `${MAINTENANCE_WINDOW_REASON_PREFIX}:${id}`;

function findMatchingMaintenanceWindow(
  candidates: readonly ActiveMaintenanceWindow[],
  episode: AlertEpisode,
  rule?: Rule
): ActiveMaintenanceWindow | undefined {
  const eventTime = Date.parse(episode.last_event_timestamp);
  if (Number.isNaN(eventTime)) return undefined;

  let context: MatcherContext | undefined;

  for (const mw of candidates) {
    if (!isEventTimestampWithinWindow(mw, eventTime)) continue;

    const kql = mw.scope?.alertingV2?.kql;
    if (!kql) {
      return mw;
    }

    context ??= createMatcherContext(episode, rule);
    if (evaluateKql(kql, context)) {
      return mw;
    }
  }

  return undefined;
}

function isEventTimestampWithinWindow(mw: ActiveMaintenanceWindow, eventTimeMs: number): boolean {
  return mw.events.some((event) => event.gteMs <= eventTimeMs && eventTimeMs <= event.lteMs);
}
