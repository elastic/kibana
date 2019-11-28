/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  addTimeline,
  addHistory,
  addNote,
  addNoteToEvent,
  addProvider,
  applyDeltaToColumnWidth,
  applyDeltaToWidth,
  applyKqlFilterQuery,
  createTimeline,
  dataProviderEdited,
  endTimelineSaving,
  pinEvent,
  removeColumn,
  removeProvider,
  setKqlFilterQueryDraft,
  showCallOutUnauthorizedMsg,
  showTimeline,
  startTimelineSaving,
  unPinEvent,
  updateAutoSaveMsg,
  updateColumns,
  updateDataProviderEnabled,
  updateDataProviderExcluded,
  updateDataProviderKqlQuery,
  updateDescription,
  updateHighlightedDropAndProviderId,
  updateIsFavorite,
  updateIsLive,
  updateItemsPerPage,
  updateItemsPerPageOptions,
  updateKqlMode,
  updatePageIndex,
  updateProviders,
  updateRange,
  updateSort,
  updateTimeline,
  updateTitle,
  upsertColumn,
  updateIsLoading,
  setSavedQueryId,
  setFilters,
} from './actions';
import {
  addNewTimeline,
  addTimelineHistory,
  addTimelineNote,
  addTimelineNoteToEvent,
  addTimelineProvider,
  addTimelineToStore,
  applyDeltaToCurrentWidth,
  applyDeltaToTimelineColumnWidth,
  applyKqlFilterQueryDraft,
  pinTimelineEvent,
  removeTimelineColumn,
  removeTimelineProvider,
  unPinTimelineEvent,
  updateHighlightedDropAndProvider,
  updateKqlFilterQueryDraft,
  updateTimelineColumns,
  updateTimelineDescription,
  updateTimelineIsFavorite,
  updateTimelineIsLive,
  updateTimelineItemsPerPage,
  updateTimelineKqlMode,
  updateTimelinePageIndex,
  updateTimelinePerPageOptions,
  updateTimelineProviderEnabled,
  updateTimelineProviderExcluded,
  updateTimelineProviderProperties,
  updateTimelineProviderKqlQuery,
  updateTimelineProviders,
  updateTimelineRange,
  updateTimelineShowTimeline,
  updateTimelineSort,
  updateTimelineTitle,
  upsertTimelineColumn,
  updateSavedQuery,
  updateFilters,
} from './helpers';

import { TimelineState, EMPTY_TIMELINE_BY_ID } from './types';

export const initialTimelineState: TimelineState = {
  timelineById: EMPTY_TIMELINE_BY_ID,
  autoSavedWarningMsg: {
    timelineId: null,
    newTimelineModel: null,
  },
  showCallOutUnauthorizedMsg: false,
};

/** The reducer for all timeline actions  */
export const timelineReducer = reducerWithInitialState(initialTimelineState)
  .case(addTimeline, (state, { id, timeline }) => ({
    ...state,
    timelineById: addTimelineToStore({ id, timeline, timelineById: state.timelineById }),
  }))
  .case(createTimeline, (state, { id, show, columns, itemsPerPage, sort }) => ({
    ...state,
    timelineById: addNewTimeline({
      columns,
      id,
      itemsPerPage,
      sort,
      show,
      timelineById: state.timelineById,
    }),
  }))
  .case(upsertColumn, (state, { column, id, index }) => ({
    ...state,
    timelineById: upsertTimelineColumn({ column, id, index, timelineById: state.timelineById }),
  }))
  .case(addHistory, (state, { id, historyId }) => ({
    ...state,
    timelineById: addTimelineHistory({ id, historyId, timelineById: state.timelineById }),
  }))
  .case(addNote, (state, { id, noteId }) => ({
    ...state,
    timelineById: addTimelineNote({ id, noteId, timelineById: state.timelineById }),
  }))
  .case(addNoteToEvent, (state, { id, noteId, eventId }) => ({
    ...state,
    timelineById: addTimelineNoteToEvent({ id, noteId, eventId, timelineById: state.timelineById }),
  }))
  .case(addProvider, (state, { id, provider }) => ({
    ...state,
    timelineById: addTimelineProvider({ id, provider, timelineById: state.timelineById }),
  }))
  .case(applyKqlFilterQuery, (state, { id, filterQuery }) => ({
    ...state,
    timelineById: applyKqlFilterQueryDraft({
      id,
      filterQuery,
      timelineById: state.timelineById,
    }),
  }))
  .case(setKqlFilterQueryDraft, (state, { id, filterQueryDraft }) => ({
    ...state,
    timelineById: updateKqlFilterQueryDraft({
      id,
      filterQueryDraft,
      timelineById: state.timelineById,
    }),
  }))
  .case(showTimeline, (state, { id, show }) => ({
    ...state,
    timelineById: updateTimelineShowTimeline({ id, show, timelineById: state.timelineById }),
  }))
  .case(applyDeltaToColumnWidth, (state, { id, columnId, delta }) => ({
    ...state,
    timelineById: applyDeltaToTimelineColumnWidth({
      id,
      columnId,
      delta,
      timelineById: state.timelineById,
    }),
  }))
  .case(
    applyDeltaToWidth,
    (state, { id, delta, bodyClientWidthPixels, minWidthPixels, maxWidthPercent }) => ({
      ...state,
      timelineById: applyDeltaToCurrentWidth({
        id,
        delta,
        bodyClientWidthPixels,
        minWidthPixels,
        maxWidthPercent,
        timelineById: state.timelineById,
      }),
    })
  )
  .case(pinEvent, (state, { id, eventId }) => ({
    ...state,
    timelineById: pinTimelineEvent({ id, eventId, timelineById: state.timelineById }),
  }))
  .case(removeColumn, (state, { id, columnId }) => ({
    ...state,
    timelineById: removeTimelineColumn({
      id,
      columnId,
      timelineById: state.timelineById,
    }),
  }))
  .case(removeProvider, (state, { id, providerId, andProviderId }) => ({
    ...state,
    timelineById: removeTimelineProvider({
      id,
      providerId,
      timelineById: state.timelineById,
      andProviderId,
    }),
  }))
  .case(startTimelineSaving, (state, { id }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        isSaving: true,
      },
    },
  }))
  .case(endTimelineSaving, (state, { id }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        isSaving: false,
      },
    },
  }))
  .case(updateIsLoading, (state, { id, isLoading }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        isLoading,
      },
    },
  }))
  .case(updateTimeline, (state, { id, timeline }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: timeline,
    },
  }))
  .case(unPinEvent, (state, { id, eventId }) => ({
    ...state,
    timelineById: unPinTimelineEvent({ id, eventId, timelineById: state.timelineById }),
  }))
  .case(updateColumns, (state, { id, columns }) => ({
    ...state,
    timelineById: updateTimelineColumns({
      id,
      columns,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateDescription, (state, { id, description }) => ({
    ...state,
    timelineById: updateTimelineDescription({ id, description, timelineById: state.timelineById }),
  }))
  .case(updateIsFavorite, (state, { id, isFavorite }) => ({
    ...state,
    timelineById: updateTimelineIsFavorite({ id, isFavorite, timelineById: state.timelineById }),
  }))
  .case(updateIsLive, (state, { id, isLive }) => ({
    ...state,
    timelineById: updateTimelineIsLive({ id, isLive, timelineById: state.timelineById }),
  }))
  .case(updateKqlMode, (state, { id, kqlMode }) => ({
    ...state,
    timelineById: updateTimelineKqlMode({ id, kqlMode, timelineById: state.timelineById }),
  }))
  .case(updateTitle, (state, { id, title }) => ({
    ...state,
    timelineById: updateTimelineTitle({ id, title, timelineById: state.timelineById }),
  }))
  .case(updateProviders, (state, { id, providers }) => ({
    ...state,
    timelineById: updateTimelineProviders({ id, providers, timelineById: state.timelineById }),
  }))
  .case(updateRange, (state, { id, start, end }) => ({
    ...state,
    timelineById: updateTimelineRange({ id, start, end, timelineById: state.timelineById }),
  }))
  .case(updateSort, (state, { id, sort }) => ({
    ...state,
    timelineById: updateTimelineSort({ id, sort, timelineById: state.timelineById }),
  }))
  .case(updateDataProviderEnabled, (state, { id, enabled, providerId, andProviderId }) => ({
    ...state,
    timelineById: updateTimelineProviderEnabled({
      id,
      enabled,
      providerId,
      timelineById: state.timelineById,
      andProviderId,
    }),
  }))
  .case(updateDataProviderExcluded, (state, { id, excluded, providerId, andProviderId }) => ({
    ...state,
    timelineById: updateTimelineProviderExcluded({
      id,
      excluded,
      providerId,
      timelineById: state.timelineById,
      andProviderId,
    }),
  }))

  .case(
    dataProviderEdited,
    (state, { andProviderId, excluded, field, id, operator, providerId, value }) => ({
      ...state,
      timelineById: updateTimelineProviderProperties({
        andProviderId,
        excluded,
        field,
        id,
        operator,
        providerId,
        timelineById: state.timelineById,
        value,
      }),
    })
  )

  .case(updateDataProviderKqlQuery, (state, { id, kqlQuery, providerId }) => ({
    ...state,
    timelineById: updateTimelineProviderKqlQuery({
      id,
      kqlQuery,
      providerId,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateItemsPerPage, (state, { id, itemsPerPage }) => ({
    ...state,
    timelineById: updateTimelineItemsPerPage({
      id,
      itemsPerPage,
      timelineById: state.timelineById,
    }),
  }))
  .case(updatePageIndex, (state, { id, activePage }) => ({
    ...state,
    timelineById: updateTimelinePageIndex({
      id,
      activePage,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateItemsPerPageOptions, (state, { id, itemsPerPageOptions }) => ({
    ...state,
    timelineById: updateTimelinePerPageOptions({
      id,
      itemsPerPageOptions,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateHighlightedDropAndProviderId, (state, { id, providerId }) => ({
    ...state,
    timelineById: updateHighlightedDropAndProvider({
      id,
      providerId,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateAutoSaveMsg, (state, { timelineId, newTimelineModel }) => ({
    ...state,
    autoSavedWarningMsg: {
      timelineId,
      newTimelineModel,
    },
  }))
  .case(showCallOutUnauthorizedMsg, state => ({
    ...state,
    showCallOutUnauthorizedMsg: true,
  }))
  .case(setSavedQueryId, (state, { id, savedQueryId }) => ({
    ...state,
    timelineById: updateSavedQuery({
      id,
      savedQueryId,
      timelineById: state.timelineById,
    }),
  }))
  .case(setFilters, (state, { id, filters }) => ({
    ...state,
    timelineById: updateFilters({
      id,
      filters,
      timelineById: state.timelineById,
    }),
  }))
  .build();
