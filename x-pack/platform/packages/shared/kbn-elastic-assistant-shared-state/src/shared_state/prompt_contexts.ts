/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs';
import { PromptContextTemplate } from '@kbn/elastic-assistant';

export class PromptContextService {
  private readonly stop$ = new ReplaySubject<void>(1);

  public start() {
    const promptContext$ = new BehaviorSubject<Record<string, PromptContextTemplate>>({});

    return {
      setPromptContext: (promptContext: Record<string, PromptContextTemplate>) => {
        promptContext$.next(promptContext);
        return () => {
          promptContext$.next({});
        };
      },

      getPromptContext$: () => promptContext$.pipe(takeUntil(this.stop$)),
    };
  }

  public stop() {
    this.stop$.next();
  }
}
