/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { get } from 'lodash/fp';
import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { from, Observable, empty } from 'rxjs';
import { filter, mergeMap, withLatestFrom, startWith, takeUntil } from 'rxjs/operators';

import { persistTimelineFavoriteMutation } from '../../containers/timeline/favorite/persist.gql_query';
import { PersistTimelineFavoriteMutation, ResponseFavoriteTimeline } from '../../graphql/types';

import {
  endTimelineSaving,
  updateIsFavorite,
  updateTimeline,
  startTimelineSaving,
} from './actions';
import { dispatcherTimelinePersistQueue } from './epic_dispatcher_timeline_persistence_queue';
import { refetchQueries } from './refetch_queries';
import { myEpicTimelineId } from './my_epic_timeline_id';
import { TimelineById } from './types';

export const timelineFavoriteActionsType = [updateIsFavorite.type];

export const epicPersistTimelineFavorite = (
  apolloClient: ApolloClient<NormalizedCacheObject>,
  action: Action,
  timeline: TimelineById,
  action$: Observable<Action>,
  timeline$: Observable<TimelineById>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Observable<any> =>
  from(
    apolloClient.mutate<
      PersistTimelineFavoriteMutation.Mutation,
      PersistTimelineFavoriteMutation.Variables
    >({
      mutation: persistTimelineFavoriteMutation,
      fetchPolicy: 'no-cache',
      variables: {
        timelineId: myEpicTimelineId.getTimelineId(),
      },
      refetchQueries,
    })
  ).pipe(
    withLatestFrom(timeline$),
    mergeMap(([result, recentTimelines]) => {
      const savedTimeline = recentTimelines[get('payload.id', action)];
      const response: ResponseFavoriteTimeline = get('data.persistFavorite', result);
      return [
        updateTimeline({
          id: get('payload.id', action),
          timeline: {
            ...savedTimeline,
            isFavorite: response.favorite != null && response.favorite.length > 0,
            savedObjectId: response.savedObjectId || null,
            version: response.version || null,
          },
        }),
        endTimelineSaving({
          id: get('payload.id', action),
        }),
      ];
    }),
    startWith(startTimelineSaving({ id: get('payload.id', action) })),
    takeUntil(
      action$.pipe(
        withLatestFrom(timeline$),
        filter(([checkAction, updatedTimeline]) => {
          if (
            checkAction.type === endTimelineSaving.type &&
            updatedTimeline[get('payload.id', checkAction)].savedObjectId != null
          ) {
            myEpicTimelineId.setTimelineId(
              updatedTimeline[get('payload.id', checkAction)].savedObjectId
            );
            myEpicTimelineId.setTimelineVersion(
              updatedTimeline[get('payload.id', checkAction)].version
            );
            return true;
          }
          return false;
        })
      )
    )
  );

export const createTimelineFavoriteEpic = <State>(): Epic<Action, Action, State> => action$ => {
  return action$.pipe(
    filter(action => timelineFavoriteActionsType.includes(action.type)),
    mergeMap(action => {
      dispatcherTimelinePersistQueue.next({ action });
      return empty();
    })
  );
};
