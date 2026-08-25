/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suppressionEpisodeKey, suppressionSeriesKey } from '../steps/utils/suppression_key';
import type { AlertEpisode, AlertEpisodeSuppression } from '../types';

/**
 * Suppression facts loaded from `.alert-actions` (FetchSuppressionsStep),
 * indexed by episode- and series-scoped keys for per-episode lookup.
 */
export class SuppressionIndex {
  private constructor(
    public readonly rows: readonly AlertEpisodeSuppression[],
    private readonly byKey: ReadonlyMap<string, AlertEpisodeSuppression>
  ) {}

  public static of(suppressions: readonly AlertEpisodeSuppression[]): SuppressionIndex {
    const byKey = new Map<string, AlertEpisodeSuppression>();
    for (const suppression of suppressions) {
      if (suppression.episode_id) {
        byKey.set(
          suppressionEpisodeKey({ ...suppression, episode_id: suppression.episode_id }),
          suppression
        );
      } else {
        byKey.set(suppressionSeriesKey(suppression), suppression);
      }
    }
    return new SuppressionIndex(suppressions, byKey);
  }

  public static empty(): SuppressionIndex {
    return SuppressionIndex.of([]);
  }

  /**
   * Reason the episode must not notify, or undefined when it may dispatch.
   * An episode-scoped suppression wins over a series-scoped one.
   */
  public suppressionReasonFor(episode: AlertEpisode): string | undefined {
    const episodeSuppression = this.byKey.get(suppressionEpisodeKey(episode));
    if (episodeSuppression?.should_suppress) {
      return suppressionReason(episodeSuppression);
    }
    const seriesSuppression = this.byKey.get(suppressionSeriesKey(episode));
    if (seriesSuppression?.should_suppress) {
      return suppressionReason(seriesSuppression);
    }
    return undefined;
  }
}

function suppressionReason(suppression: AlertEpisodeSuppression): string {
  if (suppression.last_snooze_action === 'snooze') return 'snooze';
  if (suppression.last_ack_action === 'ack') return 'ack';
  if (suppression.last_deactivate_action === 'deactivate') return 'deactivate';
  return 'unknown suppression reason';
}
