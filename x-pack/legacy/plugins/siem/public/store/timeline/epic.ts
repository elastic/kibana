/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  get,
  has,
  merge as mergeObject,
  set,
  omit,
  isObject,
  toString as fpToString,
} from 'lodash/fp';
import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { from, Observable, empty, merge } from 'rxjs';
import {
  filter,
  map,
  startWith,
  withLatestFrom,
  debounceTime,
  mergeMap,
  concatMap,
  delay,
  takeUntil,
} from 'rxjs/operators';

import { esFilters } from '../../../../../../../src/plugins/data/public';
import { persistTimelineMutation } from '../../containers/timeline/persist.gql_query';
import {
  PersistTimelineMutation,
  TimelineInput,
  ResponseTimeline,
  TimelineResult,
} from '../../graphql/types';
import { AppApolloClient } from '../../lib/lib';
import { addError } from '../app/actions';
import { NotesById } from '../app/model';
import { TimeRange } from '../inputs/model';

import {
  applyKqlFilterQuery,
  addProvider,
  dataProviderEdited,
  removeColumn,
  removeProvider,
  updateColumns,
  updateEventType,
  updateDataProviderEnabled,
  updateDataProviderExcluded,
  updateDataProviderKqlQuery,
  updateDescription,
  updateKqlMode,
  updateProviders,
  updateRange,
  updateSort,
  upsertColumn,
  updateTimeline,
  updateTitle,
  updateAutoSaveMsg,
  setFilters,
  setSavedQueryId,
  startTimelineSaving,
  endTimelineSaving,
  createTimeline,
  addTimeline,
  showCallOutUnauthorizedMsg,
} from './actions';
import { ColumnHeaderOptions, TimelineModel } from './model';
import { epicPersistNote, timelineNoteActionsType } from './epic_note';
import { epicPersistPinnedEvent, timelinePinnedEventActionsType } from './epic_pinned_event';
import { epicPersistTimelineFavorite, timelineFavoriteActionsType } from './epic_favorite';
import { isNotNull } from './helpers';
import { dispatcherTimelinePersistQueue } from './epic_dispatcher_timeline_persistence_queue';
import { refetchQueries } from './refetch_queries';
import { myEpicTimelineId } from './my_epic_timeline_id';
import { ActionTimeline, TimelineById } from './types';

interface TimelineEpicDependencies<State> {
  timelineByIdSelector: (state: State) => TimelineById;
  timelineTimeRangeSelector: (state: State) => TimeRange;
  selectNotesByIdSelector: (state: State) => NotesById;
  apolloClient$: Observable<AppApolloClient>;
}

const timelineActionsType = [
  applyKqlFilterQuery.type,
  addProvider.type,
  dataProviderEdited.type,
  removeColumn.type,
  removeProvider.type,
  setFilters.type,
  setSavedQueryId.type,
  updateColumns.type,
  updateDataProviderEnabled.type,
  updateDataProviderExcluded.type,
  updateDataProviderKqlQuery.type,
  updateDescription.type,
  updateEventType.type,
  updateKqlMode.type,
  updateProviders.type,
  updateSort.type,
  updateTitle.type,
  updateRange.type,
  upsertColumn.type,
];

const isItAtimelineAction = (timelineId: string | undefined) =>
  timelineId && timelineId.toLowerCase().startsWith('timeline');

export const createTimelineEpic = <State>(): Epic<
  Action,
  Action,
  State,
  TimelineEpicDependencies<State>
> => (
  action$,
  state$,
  { selectNotesByIdSelector, timelineByIdSelector, timelineTimeRangeSelector, apolloClient$ }
) => {
  const timeline$ = state$.pipe(map(timelineByIdSelector), filter(isNotNull));

  const notes$ = state$.pipe(map(selectNotesByIdSelector), filter(isNotNull));

  const timelineTimeRange$ = state$.pipe(map(timelineTimeRangeSelector), filter(isNotNull));

  return merge(
    action$.pipe(
      withLatestFrom(timeline$),
      filter(([action, timeline]) => {
        const timelineId: string = get('payload.id', action);
        const timelineObj: TimelineModel = timeline[timelineId];
        if (action.type === addError.type) {
          return true;
        }
        if (action.type === createTimeline.type && isItAtimelineAction(timelineId)) {
          myEpicTimelineId.setTimelineId(null);
          myEpicTimelineId.setTimelineVersion(null);
        } else if (action.type === addTimeline.type && isItAtimelineAction(timelineId)) {
          const addNewTimeline: TimelineModel = get('payload.timeline', action);
          myEpicTimelineId.setTimelineId(addNewTimeline.savedObjectId);
          myEpicTimelineId.setTimelineVersion(addNewTimeline.version);
          return true;
        } else if (
          timelineActionsType.includes(action.type) &&
          !timelineObj.isLoading &&
          isItAtimelineAction(timelineId)
        ) {
          return true;
        }
        return false;
      }),
      debounceTime(500),
      mergeMap(([action]) => {
        dispatcherTimelinePersistQueue.next({ action });
        return empty();
      })
    ),
    dispatcherTimelinePersistQueue.pipe(
      delay(500),
      withLatestFrom(timeline$, apolloClient$, notes$, timelineTimeRange$),
      concatMap(([objAction, timeline, apolloClient, notes, timelineTimeRange]) => {
        const action: ActionTimeline = get('action', objAction);
        const timelineId = myEpicTimelineId.getTimelineId();
        const version = myEpicTimelineId.getTimelineVersion();

        if (timelineNoteActionsType.includes(action.type)) {
          return epicPersistNote(apolloClient, action, timeline, notes, action$, timeline$, notes$);
        } else if (timelinePinnedEventActionsType.includes(action.type)) {
          return epicPersistPinnedEvent(apolloClient, action, timeline, action$, timeline$);
        } else if (timelineFavoriteActionsType.includes(action.type)) {
          return epicPersistTimelineFavorite(apolloClient, action, timeline, action$, timeline$);
        } else if (timelineActionsType.includes(action.type)) {
          return from(
            apolloClient.mutate<
              PersistTimelineMutation.Mutation,
              PersistTimelineMutation.Variables
            >({
              mutation: persistTimelineMutation,
              fetchPolicy: 'no-cache',
              variables: {
                timelineId,
                version,
                timeline: convertTimelineAsInput(timeline[action.payload.id], timelineTimeRange),
              },
              refetchQueries,
            })
          ).pipe(
            withLatestFrom(timeline$),
            mergeMap(([result, recentTimeline]) => {
              const savedTimeline = recentTimeline[action.payload.id];
              const response: ResponseTimeline = get('data.persistTimeline', result);
              const callOutMsg = response.code === 403 ? [showCallOutUnauthorizedMsg()] : [];

              return [
                response.code === 409
                  ? updateAutoSaveMsg({
                      timelineId: action.payload.id,
                      newTimelineModel: omitTypenameInTimeline(savedTimeline, response.timeline),
                    })
                  : updateTimeline({
                      id: action.payload.id,
                      timeline: {
                        ...savedTimeline,
                        savedObjectId: response.timeline.savedObjectId,
                        version: response.timeline.version,
                        isSaving: false,
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
        }
        return empty();
      })
    )
  );
};

const timelineInput: TimelineInput = {
  columns: null,
  dataProviders: null,
  description: null,
  eventType: null,
  filters: null,
  kqlMode: null,
  kqlQuery: null,
  title: null,
  dateRange: null,
  savedQueryId: null,
  sort: null,
};

export const convertTimelineAsInput = (
  timeline: TimelineModel,
  timelineTimeRange: TimeRange
): TimelineInput =>
  Object.keys(timelineInput).reduce<TimelineInput>((acc, key) => {
    if (has(key, timeline)) {
      if (key === 'kqlQuery') {
        return set(`${key}.filterQuery`, get(`${key}.filterQuery`, timeline), acc);
      } else if (key === 'dateRange') {
        return set(`${key}`, { start: timelineTimeRange.from, end: timelineTimeRange.to }, acc);
      } else if (key === 'columns' && get(key, timeline) != null) {
        return set(
          key,
          get(key, timeline).map((col: ColumnHeaderOptions) => omit(['width', '__typename'], col)),
          acc
        );
      } else if (key === 'filters' && get(key, timeline) != null) {
        const filters = get(key, timeline);
        return set(
          key,
          filters != null
            ? filters.map((myFilter: esFilters.Filter) => {
                const basicFilter = omit(['$state'], myFilter);
                return {
                  ...basicFilter,
                  meta: {
                    ...basicFilter.meta,
                    field:
                      (esFilters.isMatchAllFilter(basicFilter) ||
                        esFilters.isPhraseFilter(basicFilter) ||
                        esFilters.isPhrasesFilter(basicFilter) ||
                        esFilters.isRangeFilter(basicFilter)) &&
                      basicFilter.meta.field != null
                        ? convertToString(basicFilter.meta.field)
                        : null,
                    value:
                      basicFilter.meta.value != null
                        ? convertToString(basicFilter.meta.value)
                        : null,
                    params:
                      basicFilter.meta.params != null
                        ? convertToString(basicFilter.meta.params)
                        : null,
                  },
                  ...(esFilters.isMatchAllFilter(basicFilter)
                    ? {
                        match_all: convertToString(
                          (basicFilter as esFilters.MatchAllFilter).match_all
                        ),
                      }
                    : { match_all: null }),
                  ...(esFilters.isMissingFilter(basicFilter) && basicFilter.missing != null
                    ? { missing: convertToString(basicFilter.missing) }
                    : { missing: null }),
                  ...(esFilters.isExistsFilter(basicFilter) && basicFilter.exists != null
                    ? { exists: convertToString(basicFilter.exists) }
                    : { exists: null }),
                  ...((esFilters.isQueryStringFilter(basicFilter) ||
                    get('query', basicFilter) != null) &&
                  basicFilter.query != null
                    ? { query: convertToString(basicFilter.query) }
                    : { query: null }),
                  ...(esFilters.isRangeFilter(basicFilter) && basicFilter.range != null
                    ? { range: convertToString(basicFilter.range) }
                    : { range: null }),
                  ...(esFilters.isRangeFilter(basicFilter) &&
                  basicFilter.script !=
                    null /* TODO remove it when PR50713 is merged || esFilters.isPhraseFilter(basicFilter) */
                    ? { script: convertToString(basicFilter.script) }
                    : { script: null }),
                };
              })
            : [],
          acc
        );
      }
      return set(key, get(key, timeline), acc);
    }
    return acc;
  }, timelineInput);

const omitTypename = (key: string, value: keyof TimelineModel) =>
  key === '__typename' ? undefined : value;

const omitTypenameInTimeline = (
  oldTimeline: TimelineModel,
  newTimeline: TimelineResult
): TimelineModel => JSON.parse(JSON.stringify(mergeObject(oldTimeline, newTimeline)), omitTypename);

const convertToString = (obj: unknown) => {
  try {
    if (isObject(obj)) {
      return JSON.stringify(obj);
    }
    return fpToString(obj);
  } catch {
    return '';
  }
};
