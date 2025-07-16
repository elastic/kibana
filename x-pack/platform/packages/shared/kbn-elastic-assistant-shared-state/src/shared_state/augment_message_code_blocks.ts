/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs';
import { Conversation } from '@kbn/elastic-assistant';
import { UnmountCallback } from '@kbn/core-mount-utils-browser';

export interface AugmentMessageCodeBlocks {
  mount: (args: {
    currentConversation: Conversation;
    showAnonymizedValues: boolean;
  }) => UnmountCallback;
}

export const defaultValue: AugmentMessageCodeBlocks = {
  mount: () => () => {},
};

export class AugmentMessageCodeBlocksService {
  private readonly stop$ = new ReplaySubject<void>(1);

  public start() {
    const augmentMessageCodeBlocks$ = new BehaviorSubject<AugmentMessageCodeBlocks>(defaultValue);

    return {
      registerAugmentMessageCodeBlocks: (augmentMessageCodeBlocks: AugmentMessageCodeBlocks) => {
        augmentMessageCodeBlocks$.next(augmentMessageCodeBlocks);
        return () => {
          augmentMessageCodeBlocks$.next(defaultValue);
        };
      },

      getAugmentMessageCodeBlocks$: () => augmentMessageCodeBlocks$.pipe(takeUntil(this.stop$)),
    };
  }

  public stop() {
    this.stop$.next();
  }
}
