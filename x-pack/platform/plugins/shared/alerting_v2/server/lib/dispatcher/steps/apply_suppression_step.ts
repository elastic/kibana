/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertEpisode,
  AlertEpisodeSuppression,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
} from '../types';

export class ApplySuppressionStep implements DispatcherStep {
  public readonly name = 'apply_suppression';

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { episodes = [], suppressions = [] } = state;

    const { suppressed, active } = applySuppression(episodes, suppressions);

    return { type: 'continue', data: { suppressed, active } };
  }
}

export function applySuppression(
  episodes: readonly AlertEpisode[],
  suppressions: readonly AlertEpisodeSuppression[]
): { suppressed: Array<AlertEpisode & { reason: string }>; active: AlertEpisode[] } {
  const suppressionMap = new Map<string, AlertEpisodeSuppression>();

  for (const s of suppressions) {
    if (s.episode_id) {
      suppressionMap.set(`${s.rule_id}:${s.group_hash}:${s.episode_id}`, s);
    } else {
      suppressionMap.set(`${s.rule_id}:${s.group_hash}:*`, s);
    }
  }

  const suppressed: Array<AlertEpisode & { reason: string }> = [];
  const active: AlertEpisode[] = [];

  for (const ep of episodes) {
    const episodeKey = `${ep.rule_id}:${ep.group_hash}:${ep.episode_id}`;
    const seriesKey = `${ep.rule_id}:${ep.group_hash}:*`;

    const episodeSuppression = suppressionMap.get(episodeKey);
    const seriesSuppression = suppressionMap.get(seriesKey);

    if (episodeSuppression?.should_suppress || seriesSuppression?.should_suppress) {
      const matchingSuppression = episodeSuppression?.should_suppress
        ? episodeSuppression
        : seriesSuppression!;
      suppressed.push({ ...ep, reason: getSuppressionReason(matchingSuppression) });
    } else {
      active.push(ep);
    }
  }

  return { suppressed, active };
}

function getSuppressionReason(suppression: AlertEpisodeSuppression): string {
  if (suppression.last_snooze_action === 'snooze') return 'snooze';
  if (suppression.last_ack_action === 'ack') return 'ack';
  if (suppression.last_deactivate_action === 'deactivate') return 'deactivate';
  return 'unknown suppression reason';
}
