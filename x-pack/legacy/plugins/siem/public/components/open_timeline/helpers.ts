/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import ApolloClient from 'apollo-client';
import { getOr } from 'lodash/fp';
import { ActionCreator } from 'typescript-fsa';

import { Dispatch } from 'redux';
import { oneTimelineQuery } from '../../containers/timeline/one/index.gql_query';
import { TimelineResult, GetOneTimeline, NoteResult } from '../../graphql/types';
import { addNotes as dispatchAddNotes } from '../../store/app/actions';
import { setTimelineRangeDatePicker as dispatchSetTimelineRangeDatePicker } from '../../store/inputs/actions';
import {
  applyKqlFilterQuery as dispatchApplyKqlFilterQuery,
  addTimeline as dispatchAddTimeline,
} from '../../store/timeline/actions';

import { TimelineModel } from '../../store/timeline/model';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import {
  defaultColumnHeaderType,
  defaultHeaders,
} from '../timeline/body/column_headers/default_headers';
import { DEFAULT_DATE_COLUMN_MIN_WIDTH, DEFAULT_COLUMN_MIN_WIDTH } from '../timeline/body/helpers';

import { OpenTimelineResult, UpdateTimeline, DispatchUpdateTimeline } from './types';

export const OPEN_TIMELINE_CLASS_NAME = 'open-timeline';

/** Returns a count of the pinned events in a timeline */
export const getPinnedEventCount = ({ pinnedEventIds }: OpenTimelineResult): number =>
  pinnedEventIds != null ? Object.keys(pinnedEventIds).length : 0;

/** Returns the sum of all notes added to pinned events and notes applicable to the timeline */
export const getNotesCount = ({ eventIdToNoteIds, noteIds }: OpenTimelineResult): number => {
  const eventNoteCount =
    eventIdToNoteIds != null
      ? Object.keys(eventIdToNoteIds).reduce<number>(
          (count, eventId) => count + eventIdToNoteIds[eventId].length,
          0
        )
      : 0;

  const globalNoteCount = noteIds != null ? noteIds.length : 0;

  return eventNoteCount + globalNoteCount;
};

/** Returns true if the timeline is untitlied */
export const isUntitled = ({ title }: OpenTimelineResult): boolean =>
  title == null || title.trim().length === 0;

const omitTypename = (key: string, value: keyof TimelineModel) =>
  key === '__typename' ? undefined : value;

const omitTypenameInTimeline = (timeline: TimelineResult): TimelineResult =>
  JSON.parse(JSON.stringify(timeline), omitTypename);

export const formatTimelineResultToModel = (
  timelineToOpen: TimelineResult,
  duplicate: boolean = false
): { notes: NoteResult[] | null | undefined; timeline: TimelineModel } => {
  const { notes, ...timelineModel } = timelineToOpen;
  return {
    notes,
    timeline: {
      ...timelineModel,
      columns:
        timelineModel.columns != null
          ? timelineModel.columns.map(col => {
              const timelineCols: ColumnHeader = {
                ...col,
                columnHeaderType: defaultColumnHeaderType,
                id: col.id != null ? col.id : 'unknown',
                placeholder: col.placeholder != null ? col.placeholder : undefined,
                category: col.category != null ? col.category : undefined,
                description: col.description != null ? col.description : undefined,
                example: col.example != null ? col.example : undefined,
                type: col.type != null ? col.type : undefined,
                aggregatable: col.aggregatable != null ? col.aggregatable : undefined,
                width:
                  col.id === '@timestamp'
                    ? DEFAULT_DATE_COLUMN_MIN_WIDTH
                    : DEFAULT_COLUMN_MIN_WIDTH,
              };
              return timelineCols;
            })
          : defaultHeaders,
      eventIdToNoteIds: duplicate
        ? {}
        : timelineModel.eventIdToNoteIds != null
        ? timelineModel.eventIdToNoteIds.reduce((acc, note) => {
            if (note.eventId != null) {
              const eventNotes = getOr([], note.eventId, acc);
              return { ...acc, [note.eventId]: [...eventNotes, note.noteId] };
            }
            return acc;
          }, {})
        : {},
      isFavorite: duplicate
        ? false
        : timelineModel.favorite != null
        ? timelineModel.favorite.length > 0
        : false,
      noteIds: duplicate ? [] : timelineModel.noteIds != null ? timelineModel.noteIds : [],
      pinnedEventIds: duplicate
        ? {}
        : timelineModel.pinnedEventIds != null
        ? timelineModel.pinnedEventIds.reduce(
            (acc, pinnedEventId) => ({ ...acc, [pinnedEventId]: true }),
            {}
          )
        : {},
      pinnedEventsSaveObject: duplicate
        ? {}
        : timelineModel.pinnedEventsSaveObject != null
        ? timelineModel.pinnedEventsSaveObject.reduce(
            (acc, pinnedEvent) => ({
              ...acc,
              ...(pinnedEvent.eventId != null ? { [pinnedEvent.eventId]: pinnedEvent } : {}),
            }),
            {}
          )
        : {},
      savedObjectId: duplicate ? null : timelineModel.savedObjectId,
      version: duplicate ? null : timelineModel.version,
      title: duplicate ? '' : timelineModel.title || '',
    } as TimelineModel,
  };
};

export interface QueryTimelineById<TCache> {
  apolloClient: ApolloClient<TCache> | ApolloClient<{}> | undefined;
  duplicate: boolean;
  timelineId: string;
  updateIsLoading: ActionCreator<{ id: string; isLoading: boolean }>;
  updateTimeline: DispatchUpdateTimeline;
}

export const queryTimelineById = <TCache>({
  apolloClient,
  duplicate = false,
  timelineId,
  updateIsLoading,
  updateTimeline,
}: QueryTimelineById<TCache>) => {
  updateIsLoading({ id: 'timeline-1', isLoading: true });
  if (apolloClient) {
    apolloClient
      .query<GetOneTimeline.Query, GetOneTimeline.Variables>({
        query: oneTimelineQuery,
        fetchPolicy: 'no-cache',
        variables: { id: timelineId },
      })
      // eslint-disable-next-line
      .then(result => {
        const timelineToOpen: TimelineResult = omitTypenameInTimeline(
          getOr({}, 'data.getOneTimeline', result)
        );

        const { timeline, notes } = formatTimelineResultToModel(timelineToOpen, duplicate);

        const momentDate = dateMath.parse('now-24h');
        if (updateTimeline) {
          updateTimeline({
            duplicate,
            from: getOr(momentDate ? momentDate.valueOf() : 0, 'dateRange.start', timeline),
            id: 'timeline-1',
            notes,
            timeline,
            to: getOr(Date.now(), 'dateRange.end', timeline),
          })();
        }
      })
      .finally(() => {
        updateIsLoading({ id: 'timeline-1', isLoading: false });
      });
  }
};

export const dispatchUpdateTimeline = (dispatch: Dispatch): DispatchUpdateTimeline => ({
  duplicate,
  id,
  from,
  notes,
  timeline,
  to,
}: UpdateTimeline): (() => void) => () => {
  dispatch(dispatchSetTimelineRangeDatePicker({ from, to }));
  dispatch(dispatchAddTimeline({ id, timeline }));
  if (
    timeline.kqlQuery != null &&
    timeline.kqlQuery.filterQuery != null &&
    timeline.kqlQuery.filterQuery.kuery != null &&
    timeline.kqlQuery.filterQuery.kuery.expression !== ''
  ) {
    dispatch(
      dispatchApplyKqlFilterQuery({
        id,
        filterQuery: {
          kuery: {
            kind: 'kuery',
            expression: timeline.kqlQuery.filterQuery.kuery.expression || '',
          },
          serializedQuery: timeline.kqlQuery.filterQuery.serializedQuery || '',
        },
      })
    );
  }
  if (!duplicate) {
    dispatch(
      dispatchAddNotes({
        notes:
          notes != null
            ? notes.map((note: NoteResult) => ({
                created: note.created != null ? new Date(note.created) : new Date(),
                id: note.noteId,
                lastEdit: note.updated != null ? new Date(note.updated) : new Date(),
                note: note.note || '',
                user: note.updatedBy || 'unknown',
                saveObjectId: note.noteId,
                version: note.version,
              }))
            : [],
      })
    );
  }
};
