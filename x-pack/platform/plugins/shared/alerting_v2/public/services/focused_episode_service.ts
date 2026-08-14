/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { injectable } from 'inversify';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';

export interface FocusedEpisode {
  episode: AlertEpisode;
  ruleName?: string;
  groupingFields?: readonly string[];
}

@injectable()
export class FocusedEpisodeService {
  private readonly focusedEpisodeSubject$ = new BehaviorSubject<FocusedEpisode | undefined>(
    undefined
  );

  public readonly focusedEpisode$ = this.focusedEpisodeSubject$.asObservable();

  public setFocusedEpisode(
    episode: AlertEpisode,
    options?: { ruleName?: string; groupingFields?: readonly string[] }
  ): void {
    this.focusedEpisodeSubject$.next({
      episode,
      ruleName: options?.ruleName,
      groupingFields: options?.groupingFields,
    });
  }

  public clearFocusedEpisode(episodeId?: string): void {
    const focusedEpisode = this.focusedEpisodeSubject$.getValue();

    if (episodeId && focusedEpisode?.episode['episode.id'] !== episodeId) {
      return;
    }

    this.focusedEpisodeSubject$.next(undefined);
  }

  public getFocusedEpisode(): AlertEpisode | undefined {
    return this.focusedEpisodeSubject$.getValue()?.episode;
  }
}
