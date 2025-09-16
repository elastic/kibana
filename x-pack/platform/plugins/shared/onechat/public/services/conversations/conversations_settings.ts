/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs';
import type { ConversationSettings } from '../types';

export class ConversationSettingsService {
  private readonly stop$ = new ReplaySubject<void>(1);

  public start() {
    const conversationSettings$ = new BehaviorSubject<ConversationSettings>({});

    return {
      setConversationSettings: (conversationSettings: ConversationSettings) => {
        conversationSettings$.next(conversationSettings);
        return () => {
          conversationSettings$.next({});
        };
      },

      getConversationSettings$: () => conversationSettings$.pipe(takeUntil(this.stop$)),
    };
  }

  public stop() {
    this.stop$.next();
  }
}
