/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluateKql } from '@kbn/eval-kql';
import { inject, injectable } from 'inversify';
import type { MatcherContext } from '@kbn/alerting-v2-schemas';
import type {
  ActiveMaintenanceWindow,
  MaintenanceWindowServiceContract,
} from '../../services/maintenance_window_service/maintenance_window_service';
import { MaintenanceWindowServiceInternalToken } from '../../services/maintenance_window_service/tokens';
import type {
  AlertEpisode,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
  Rule,
} from '../types';

/**
 * Suppresses episodes whose `last_event_timestamp` falls within an active
 * maintenance window in the same space, and whose `episode.data` matches the
 * maintenance window's optional episode-data KQL filter (`scope.episodes.kql`,
 * experimental).
 *
 * The category filter (`mw.categoryIds`) is intentionally NOT applied here —
 * v2 rules have no category concept yet. Once v2 introduces a category
 * vocabulary, gate the candidate set on it before the schedule check.
 *
 * The DSL form of `scope.episodes` is built and stored on save but is not
 * evaluated at runtime; only the KQL string is consulted in-memory.
 */
@injectable()
export class ApplyMaintenanceWindowStep implements DispatcherStep {
  public readonly name = 'apply_maintenance_window';

  constructor(
    @inject(MaintenanceWindowServiceInternalToken)
    private readonly maintenanceWindowService: MaintenanceWindowServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { dispatchable = [], suppressed = [], rules = new Map(), input } = state;
    if (dispatchable.length === 0) {
      return { type: 'continue' };
    }

    const activeWindows = await this.maintenanceWindowService.getActiveMaintenanceWindows(
      input.startedAt
    );
    if (activeWindows.length === 0) {
      return { type: 'continue' };
    }

    const windowsBySpace = new Map<string, ActiveMaintenanceWindow[]>();
    for (const mw of activeWindows) {
      const arr = windowsBySpace.get(mw.spaceId);
      if (arr) arr.push(mw);
      else windowsBySpace.set(mw.spaceId, [mw]);
    }

    const newDispatchable: AlertEpisode[] = [];
    const newlySuppressed: Array<AlertEpisode & { reason: string }> = [];

    for (const episode of dispatchable) {
      const rule = rules.get(episode.rule_id);
      if (!rule) {
        newDispatchable.push(episode);
        continue;
      }

      const candidates = windowsBySpace.get(rule.spaceId) ?? [];
      const matched = findMatchingMaintenanceWindow(candidates, episode, rule);
      if (matched) {
        newlySuppressed.push({ ...episode, reason: `maintenance_window:${matched.id}` });
      } else {
        newDispatchable.push(episode);
      }
    }

    if (newlySuppressed.length === 0) {
      return { type: 'continue' };
    }

    return {
      type: 'continue',
      data: {
        dispatchable: newDispatchable,
        suppressed: [...suppressed, ...newlySuppressed],
      },
    };
  }
}

function findMatchingMaintenanceWindow(
  candidates: readonly ActiveMaintenanceWindow[],
  episode: AlertEpisode,
  rule: Rule
): ActiveMaintenanceWindow | undefined {
  if (candidates.length === 0) return undefined;

  const eventTime = Date.parse(episode.last_event_timestamp);
  if (Number.isNaN(eventTime)) return undefined;

  let context: MatcherContext | undefined;

  for (const mw of candidates) {
    if (!isEventTimestampWithinWindow(mw, eventTime)) continue;

    const kql = mw.scope?.episodes?.kql;
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
  return mw.events.some(
    (event) => Date.parse(event.gte) <= eventTimeMs && eventTimeMs <= Date.parse(event.lte)
  );
}

function createMatcherContext(episode: AlertEpisode, rule: Rule): MatcherContext {
  return {
    last_event_timestamp: episode.last_event_timestamp,
    group_hash: episode.group_hash,
    episode_id: episode.episode_id,
    episode_status: episode.episode_status,
    ...(episode.data ? { data: episode.data } : {}),
    rule: {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      tags: rule.tags,
      enabled: rule.enabled,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    },
  };
}
