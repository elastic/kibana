/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode } from '../types';

/**
 * Result of the windowed candidate-episode scan (FetchEpisodesStep): the fetched
 * rows plus whether the scan hit EPISODE_QUERY_LIMIT and deferred a tail.
 */
export class EpisodeScan {
  private static readonly EMPTY = new EpisodeScan([], false);

  private constructor(
    public readonly episodes: readonly AlertEpisode[],
    /** True when the scan reached EPISODE_QUERY_LIMIT and a tail was deferred. */
    public readonly truncated: boolean
  ) {}

  public static of({
    episodes,
    truncated = false,
  }: {
    episodes: readonly AlertEpisode[];
    truncated?: boolean;
  }): EpisodeScan {
    return new EpisodeScan(episodes, truncated);
  }

  public static empty(): EpisodeScan {
    return EpisodeScan.EMPTY;
  }

  public isEmpty(): boolean {
    return this.episodes.length === 0;
  }

  /**
   * Timestamp of the last fetched episode — rows arrive sorted ascending, so
   * this is the truncation edge the watermark advances to on a truncated tick.
   * A corrupt timestamp yields an Invalid Date rather than throwing; callers
   * must clamp or guard against it.
   */
  public truncationEdge(): Date | undefined {
    const lastEpisode = this.episodes[this.episodes.length - 1];
    return lastEpisode ? new Date(lastEpisode.last_event_timestamp) : undefined;
  }
}
