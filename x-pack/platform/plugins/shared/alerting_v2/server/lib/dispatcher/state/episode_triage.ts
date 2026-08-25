/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode, RuleId } from '../types';

export type SuppressedEpisode = AlertEpisode & { reason: string };

/**
 * The evolving verdict on candidate episodes: which may still notify
 * (`dispatchable`) and which must not (`suppressed`, with the reason).
 * Created by ApplySuppressionStep, enriched by HydrateEpisodeDataStep,
 * re-partitioned by ApplyMaintenanceWindowStep — each returns a new instance.
 */
export class EpisodeTriage {
  private constructor(
    public readonly dispatchable: readonly AlertEpisode[],
    public readonly suppressed: readonly SuppressedEpisode[]
  ) {}

  public static of({
    dispatchable,
    suppressed,
  }: {
    dispatchable: readonly AlertEpisode[];
    suppressed: readonly SuppressedEpisode[];
  }): EpisodeTriage {
    return new EpisodeTriage(dispatchable, suppressed);
  }

  public static empty(): EpisodeTriage {
    return new EpisodeTriage([], []);
  }

  /** Partition episodes: a returned reason means "suppress". */
  public static partition(
    episodes: readonly AlertEpisode[],
    suppressionReasonFor: (episode: AlertEpisode) => string | undefined
  ): EpisodeTriage {
    return EpisodeTriage.empty().suppressWhere(episodes, suppressionReasonFor);
  }

  /**
   * Re-partition the dispatchable set: episodes with a reason move to
   * `suppressed` (appended after the already-suppressed ones), the rest stay
   * dispatchable.
   */
  public suppressDispatchableWhere(
    suppressionReasonFor: (episode: AlertEpisode) => string | undefined
  ): EpisodeTriage {
    return this.suppressWhere(this.dispatchable, suppressionReasonFor);
  }

  /** Replace each dispatchable episode 1:1 (e.g. `data` enrichment). */
  public mapDispatchable(fn: (episode: AlertEpisode) => AlertEpisode): EpisodeTriage {
    return new EpisodeTriage(this.dispatchable.map(fn), this.suppressed);
  }

  public hasDispatchable(): boolean {
    return this.dispatchable.length > 0;
  }

  public dispatchableEpisodeIds(): string[] {
    return [...new Set(this.dispatchable.map((episode) => episode.episode_id))];
  }

  public dispatchableRuleIds(): RuleId[] {
    return [
      ...new Set(
        this.dispatchable
          .map((episode) => episode.rule_id)
          .filter((id): id is RuleId => id !== null)
      ),
    ];
  }

  private suppressWhere(
    episodes: readonly AlertEpisode[],
    suppressionReasonFor: (episode: AlertEpisode) => string | undefined
  ): EpisodeTriage {
    const dispatchable: AlertEpisode[] = [];
    const suppressed: SuppressedEpisode[] = [...this.suppressed];

    for (const episode of episodes) {
      const reason = suppressionReasonFor(episode);
      if (reason !== undefined) {
        suppressed.push({ ...episode, reason });
      } else {
        dispatchable.push(episode);
      }
    }

    return new EpisodeTriage(dispatchable, suppressed);
  }
}
