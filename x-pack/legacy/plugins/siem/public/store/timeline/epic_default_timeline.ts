/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of, Observable, from } from 'rxjs';
import { get } from 'lodash/fp';
import { filter, withLatestFrom, mergeMap, startWith, takeUntil } from 'rxjs/operators';
import { Epic } from 'redux-observable';
import { Action } from 'redux';
import {
  getDefaultTimeline as getDefaultTimelineAction,
  showCallOutUnauthorizedMsg,
  endTimelineSaving,
  startTimelineSaving,
} from './actions';
import { getDefaultTimeline } from '../../containers/timeline/api';
import { ActionTimeline, TimelineById } from './types';
import { myEpicTimelineId } from './my_epic_timeline_id';
import { addError } from '../app/actions';
import {
  formatTimelineResultToModel,
  epicUpdateTimeline,
} from '../../components/open_timeline/helpers';
import { getTimeRangeSettings } from '../../utils/default_date_settings';
import { ResponseTimeline } from '../../graphql/types';

export const epicDefaultTimeline = (
  action: ActionTimeline,
  timeline: TimelineById,
  action$: Observable<Action>,
  timeline$: Observable<TimelineById>,
  clean: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Observable<any> =>
  // !!myEpicTimelineId.getTimelineId()
  from(getDefaultTimeline({ clean })).pipe(
    withLatestFrom(timeline$),
    mergeMap(([result, recentTimelines]) => {
      const savedTimeline = recentTimelines[action.payload.id];
      const response: ResponseTimeline = get('data.persistTimeline', result);
      const callOutMsg = response.code === 403 ? [showCallOutUnauthorizedMsg()] : [];

      const { timeline: timelineModel, notes } = formatTimelineResultToModel(
        response.timeline,
        false
      );
      const { from: settingsFrom, to: settingsTo } = getTimeRangeSettings();

      return [
        ...callOutMsg,
        ...epicUpdateTimeline({
          duplicate: false,
          from: savedTimeline.dateRange.start ?? settingsFrom,
          id: 'timeline-1',
          notes,
          timeline: {
            ...timelineModel,
            show: savedTimeline?.show ?? false,
          },
          to: savedTimeline.dateRange.end ?? settingsTo,
        }),
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

export const createDefaultTimelineEpic = <State>(): Epic<Action, Action, State> => () =>
  of(getDefaultTimelineAction({ id: 'timeline-1' }));
