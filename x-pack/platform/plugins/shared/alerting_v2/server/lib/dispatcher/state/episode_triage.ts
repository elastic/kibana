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
  private static readonly EMPTY = new EpisodeTriage([], []);

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
    return EpisodeTriage.EMPTY;
  }

  /** Partition episodes: a returned reason means "suppress". */
  public static partition(
    episodes: readonly AlertEpisode[],
    suppressionReasonFor: (episode: AlertEpisode) => string | undefined
  ): EpisodeTriage {
    return EpisodeTriage.EMPTY.suppressWhere(episodes, suppressionReasonFor);
  }

  /**
   * Re-partition the dispatchable set: episodes with a reason move to
   * `suppressed` (appended after the already-suppressed ones), the rest stay
   * dispatchable. Returns `this` unchanged when nothing was newly suppressed,
   * so callers can detect a no-op by identity.
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
    const ids = new Set<string>();
    for (const episode of this.dispatchable) {
      ids.add(episode.episode_id);
    }
    return Array.from(ids);
  }

  public dispatchableRuleIds(): RuleId[] {
    const ids = new Set<RuleId>();
    for (const episode of this.dispatchable) {
      if (episode.rule_id !== null) {
        ids.add(episode.rule_id);
      }
    }
    return Array.from(ids);
  }

  private suppressWhere(
    episodes: readonly AlertEpisode[],
    suppressionReasonFor: (episode: AlertEpisode) => string | undefined
  ): EpisodeTriage {
    const dispatchable: AlertEpisode[] = [];
    // Only copied on the first newly suppressed episode, so a tick where
    // nothing matches allocates no suppressed array and returns `this`.
    let suppressed: SuppressedEpisode[] | undefined;

    for (const episode of episodes) {
      const reason = suppressionReasonFor(episode);
      if (reason !== undefined) {
        suppressed ??= [...this.suppressed];
        suppressed.push({ ...episode, reason });
      } else {
        dispatchable.push(episode);
      }
    }

    if (suppressed === undefined && episodes === this.dispatchable) {
      return this;
    }

    return new EpisodeTriage(dispatchable, suppressed ?? this.suppressed);
  }
}
