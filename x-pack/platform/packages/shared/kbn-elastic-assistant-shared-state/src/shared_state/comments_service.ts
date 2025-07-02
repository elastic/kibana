/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MountPoint } from '@kbn/core-mount-utils-browser';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { map, takeUntil } from 'rxjs';
import { sortBy } from 'lodash';
import { ClientMessage } from '@kbn/elastic-assistant';

export interface CommentServiceActions {
  order?: number;
  mount: (args: { message: ClientMessage }) => MountPoint;
}

export class CommentsService {
  private readonly stop$ = new ReplaySubject<void>(1);

  public start() {
    const actions$ = new BehaviorSubject<ReadonlySet<CommentServiceActions>>(new Set());

    return {
      registerActions: (actions: CommentServiceActions) => {
        actions$.next(new Set([...actions$.value.values(), actions]));
        return () => {
          const newActions = new Set([...actions$.value.values()].filter((a) => a !== actions));
          actions$.next(newActions);
        };
      },

      getActions$: () =>
        actions$.pipe(
          map((actions) => sortBy([...actions.values()], 'order')),
          takeUntil(this.stop$)
        ),
    };
  }

  public stop() {
    this.stop$.next();
  }
}
