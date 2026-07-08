/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type {
  AlertEpisode,
  AlertEpisodeSuppression,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
} from '../types';
import { shouldUnsnoozeByConditions } from '../evaluate_snooze_conditions';

@injectable()
export class ApplySuppressionStep implements DispatcherStep {
  public readonly name = 'apply_suppression';

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { episodes = [], suppressions = [] } = state;

    const { suppressed, dispatchable, autoUnsnoozed } = applySuppression(episodes, suppressions);

    return { type: 'continue', data: { suppressed, dispatchable, autoUnsnoozed } };
  }
}

export function applySuppression(
  episodes: readonly AlertEpisode[],
  suppressions: readonly AlertEpisodeSuppression[]
): {
  suppressed: Array<AlertEpisode & { reason: string }>;
  dispatchable: AlertEpisode[];
  // Episodes whose conditional snooze was lifted this run. Persisted as an `unsnooze` action so the
  // lift is durable (and reflected in the UI), not just applied to this run's dispatch decision.
  autoUnsnoozed: AlertEpisode[];
} {
  const suppressionMap = new Map<string, AlertEpisodeSuppression>();

  for (const s of suppressions) {
    if (s.episode_id) {
      suppressionMap.set(`${s.rule_id}:${s.group_hash}:${s.episode_id}`, s);
    } else {
      suppressionMap.set(`${s.rule_id}:${s.group_hash}:*`, s);
    }
  }

  const suppressed: Array<AlertEpisode & { reason: string }> = [];
  const dispatchable: AlertEpisode[] = [];
  const autoUnsnoozed: AlertEpisode[] = [];

  for (const ep of episodes) {
    const episodeKey = `${ep.rule_id}:${ep.group_hash}:${ep.episode_id}`;
    const seriesKey = `${ep.rule_id}:${ep.group_hash}:*`;

    const episodeResult = evaluateSuppression(suppressionMap.get(episodeKey), ep);
    const seriesResult = evaluateSuppression(suppressionMap.get(seriesKey), ep);

    // Prefer the episode-scoped suppression over the series wildcard when both apply.
    const result = episodeResult?.suppress
      ? episodeResult
      : seriesResult?.suppress
      ? seriesResult
      : undefined;

    if (result) {
      suppressed.push({ ...ep, reason: result.reason });
    } else {
      dispatchable.push(ep);
    }

    // A lifted conditional snooze is recorded regardless of the suppress/dispatch outcome (an
    // episode can be lifted yet still suppressed by a concurrent ack/deactivate).
    if (episodeResult?.snoozeLifted || seriesResult?.snoozeLifted) {
      autoUnsnoozed.push(ep);
    }
  }

  return { suppressed, dispatchable, autoUnsnoozed };
}

interface SuppressionEvaluation {
  suppress: boolean;
  reason: string;
  /** True when this record is a conditional snooze whose conditions are now met (the snooze lifts). */
  snoozeLifted: boolean;
}

/**
 * Evaluates a single suppression record against an episode. Non-conditional suppressions use the
 * `should_suppress` boolean computed by the ES|QL query, unchanged. A conditional snooze contributes
 * to suppression only while its conditions are unmet; once its conditions are met the snooze is
 * lifted, but any concurrent ack/deactivate still suppresses (suppressors are independent).
 */
function evaluateSuppression(
  suppression: AlertEpisodeSuppression | undefined,
  episode: AlertEpisode
): SuppressionEvaluation | undefined {
  if (!suppression) {
    return undefined;
  }

  const hasSnoozeConditions =
    suppression.last_snooze_action === 'snooze' && (suppression.conditions?.length ?? 0) > 0;

  if (!hasSnoozeConditions) {
    return suppression.should_suppress
      ? { suppress: true, reason: getSuppressionReason(suppression), snoozeLifted: false }
      : { suppress: false, reason: '', snoozeLifted: false };
  }

  const snoozeLifted = shouldUnsnoozeByConditions(
    suppression.conditions!,
    suppression.condition_operator,
    suppression.baseline,
    episode
  );

  if (!snoozeLifted) return { suppress: true, reason: 'snooze', snoozeLifted: false };
  if (suppression.last_ack_action === 'ack') return { suppress: true, reason: 'ack', snoozeLifted };
  if (suppression.last_deactivate_action === 'deactivate') {
    return { suppress: true, reason: 'deactivate', snoozeLifted };
  }
  return { suppress: false, reason: '', snoozeLifted };
}

function getSuppressionReason(suppression: AlertEpisodeSuppression): string {
  if (suppression.last_snooze_action === 'snooze') return 'snooze';
  if (suppression.last_ack_action === 'ack') return 'ack';
  if (suppression.last_deactivate_action === 'deactivate') return 'deactivate';
  return 'unknown suppression reason';
}
