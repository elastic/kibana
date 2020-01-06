/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { get, omit } from 'lodash/fp';
import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { from, Observable, empty } from 'rxjs';
import { filter, mergeMap, startWith, withLatestFrom, takeUntil } from 'rxjs/operators';

import { persistTimelinePinnedEventMutation } from '../../containers/timeline/pinned_event/persist.gql_query';
import { PersistTimelinePinnedEventMutation, PinnedEvent } from '../../graphql/types';
import { addError } from '../app/actions';
import {
  pinEvent,
  endTimelineSaving,
  unPinEvent,
  updateTimeline,
  startTimelineSaving,
  showCallOutUnauthorizedMsg,
} from './actions';
import { myEpicTimelineId } from './my_epic_timeline_id';
import { refetchQueries } from './refetch_queries';
import { dispatcherTimelinePersistQueue } from './epic_dispatcher_timeline_persistence_queue';
import { ActionTimeline, TimelineById } from './types';

export const timelinePinnedEventActionsType = [pinEvent.type, unPinEvent.type];

export const epicPersistPinnedEvent = (
  apolloClient: ApolloClient<NormalizedCacheObject>,
  action: ActionTimeline,
  timeline: TimelineById,
  action$: Observable<Action>,
  timeline$: Observable<TimelineById>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Observable<any> =>
  from(
    apolloClient.mutate<
      PersistTimelinePinnedEventMutation.Mutation,
      PersistTimelinePinnedEventMutation.Variables
    >({
      mutation: persistTimelinePinnedEventMutation,
      fetchPolicy: 'no-cache',
      variables: {
        pinnedEventId:
          timeline[action.payload.id].pinnedEventsSaveObject[action.payload.eventId] != null
            ? timeline[action.payload.id].pinnedEventsSaveObject[action.payload.eventId]
                .pinnedEventId
            : null,
        eventId: action.payload.eventId,
        timelineId: myEpicTimelineId.getTimelineId(),
      },
      refetchQueries,
    })
  ).pipe(
    withLatestFrom(timeline$),
    mergeMap(([result, recentTimeline]) => {
      const savedTimeline = recentTimeline[action.payload.id];
      const response: PinnedEvent = get('data.persistPinnedEventOnTimeline', result);
      const callOutMsg = response && response.code === 403 ? [showCallOutUnauthorizedMsg()] : [];

      return [
        response != null
          ? updateTimeline({
              id: action.payload.id,
              timeline: {
                ...savedTimeline,
                savedObjectId:
                  savedTimeline.savedObjectId == null && response.timelineId != null
                    ? response.timelineId
                    : savedTimeline.savedObjectId,
                version:
                  savedTimeline.version == null && response.timelineVersion != null
                    ? response.timelineVersion
                    : savedTimeline.version,
                pinnedEventIds: {
                  ...savedTimeline.pinnedEventIds,
                  [action.payload.eventId]: true,
                },
                pinnedEventsSaveObject: {
                  ...savedTimeline.pinnedEventsSaveObject,
                  [action.payload.eventId]: response,
                },
              },
            })
          : updateTimeline({
              id: action.payload.id,
              timeline: {
                ...savedTimeline,
                pinnedEventIds: omit(action.payload.eventId, savedTimeline.pinnedEventIds),
                pinnedEventsSaveObject: omit(
                  action.payload.eventId,
                  savedTimeline.pinnedEventsSaveObject
                ),
              },
            }),
        ...callOutMsg,
        endTimelineSaving({
          id: action.payload.id,
        }),
      ];
    }),
    startWith(startTimelineSaving({ id: action.payload.id })),
    takeUntil(
      action$.pipe(
        withLatestFrom(timeline$),
        filter(([checkAction, updatedTimeline]) => {
          if (checkAction.type === addError.type) {
            return true;
          }
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

export const createTimelinePinnedEventEpic = <State>(): Epic<Action, Action, State> => action$ =>
  action$.pipe(
    filter(action => timelinePinnedEventActionsType.includes(action.type)),
    mergeMap(action => {
      dispatcherTimelinePersistQueue.next({ action });
      return empty();
    })
  );
