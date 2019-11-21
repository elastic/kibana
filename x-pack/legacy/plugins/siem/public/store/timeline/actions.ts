/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { esFilters } from '../../../../../../../src/plugins/data/public';
import { ColumnHeader } from '../../components/timeline/body/column_headers/column_header';
import { Sort } from '../../components/timeline/body/sort';
import {
  DataProvider,
  QueryOperator,
} from '../../components/timeline/data_providers/data_provider';
import { KueryFilterQuery, SerializedFilterQuery } from '../model';

import { KqlMode, TimelineModel } from './model';

const actionCreator = actionCreatorFactory('x-pack/siem/local/timeline');

export const addHistory = actionCreator<{ id: string; historyId: string }>('ADD_HISTORY');

export const addNote = actionCreator<{ id: string; noteId: string }>('ADD_NOTE');

export const addNoteToEvent = actionCreator<{ id: string; noteId: string; eventId: string }>(
  'ADD_NOTE_TO_EVENT'
);

export const upsertColumn = actionCreator<{ column: ColumnHeader; id: string; index: number }>(
  'UPSERT_COLUMN'
);

export const addProvider = actionCreator<{ id: string; provider: DataProvider }>('ADD_PROVIDER');

export const applyDeltaToWidth = actionCreator<{
  id: string;
  delta: number;
  bodyClientWidthPixels: number;
  minWidthPixels: number;
  maxWidthPercent: number;
}>('APPLY_DELTA_TO_WIDTH');

export const applyDeltaToColumnWidth = actionCreator<{
  id: string;
  columnId: string;
  delta: number;
}>('APPLY_DELTA_TO_COLUMN_WIDTH');

export const createTimeline = actionCreator<{
  id: string;
  columns: ColumnHeader[];
  itemsPerPage?: number;
  show?: boolean;
  sort?: Sort;
}>('CREATE_TIMELINE');

export const pinEvent = actionCreator<{ id: string; eventId: string }>('PIN_EVENT');

export const removeColumn = actionCreator<{
  id: string;
  columnId: string;
}>('REMOVE_COLUMN');

export const removeProvider = actionCreator<{
  id: string;
  providerId: string;
  andProviderId?: string;
}>('REMOVE_PROVIDER');

export const showTimeline = actionCreator<{ id: string; show: boolean }>('SHOW_TIMELINE');

export const unPinEvent = actionCreator<{ id: string; eventId: string }>('UN_PIN_EVENT');

export const updateTimeline = actionCreator<{
  id: string;
  timeline: TimelineModel;
}>('UPDATE_TIMELINE');

export const addTimeline = actionCreator<{
  id: string;
  timeline: TimelineModel;
}>('ADD_TIMELINE');

export const startTimelineSaving = actionCreator<{
  id: string;
}>('START_TIMELINE_SAVING');

export const endTimelineSaving = actionCreator<{
  id: string;
}>('END_TIMELINE_SAVING');

export const updateIsLoading = actionCreator<{
  id: string;
  isLoading: boolean;
}>('UPDATE_LOADING');

export const updateColumns = actionCreator<{
  id: string;
  columns: ColumnHeader[];
}>('UPDATE_COLUMNS');

export const updateDataProviderEnabled = actionCreator<{
  id: string;
  enabled: boolean;
  providerId: string;
  andProviderId?: string;
}>('TOGGLE_PROVIDER_ENABLED');

export const updateDataProviderExcluded = actionCreator<{
  id: string;
  excluded: boolean;
  providerId: string;
  andProviderId?: string;
}>('TOGGLE_PROVIDER_EXCLUDED');

export const dataProviderEdited = actionCreator<{
  andProviderId?: string;
  excluded: boolean;
  field: string;
  id: string;
  operator: QueryOperator;
  providerId: string;
  value: string | number;
}>('DATA_PROVIDER_EDITED');

export const updateDataProviderKqlQuery = actionCreator<{
  id: string;
  kqlQuery: string;
  providerId: string;
}>('PROVIDER_EDIT_KQL_QUERY');

export const updateHighlightedDropAndProviderId = actionCreator<{
  id: string;
  providerId: string;
}>('UPDATE_DROP_AND_PROVIDER');

export const updateDescription = actionCreator<{ id: string; description: string }>(
  'UPDATE_DESCRIPTION'
);

export const updateKqlMode = actionCreator<{ id: string; kqlMode: KqlMode }>('UPDATE_KQL_MODE');

export const setKqlFilterQueryDraft = actionCreator<{
  id: string;
  filterQueryDraft: KueryFilterQuery;
}>('SET_KQL_FILTER_QUERY_DRAFT');

export const applyKqlFilterQuery = actionCreator<{
  id: string;
  filterQuery: SerializedFilterQuery;
}>('APPLY_KQL_FILTER_QUERY');

export const updateIsFavorite = actionCreator<{ id: string; isFavorite: boolean }>(
  'UPDATE_IS_FAVORITE'
);

export const updateIsLive = actionCreator<{ id: string; isLive: boolean }>('UPDATE_IS_LIVE');

export const updateItemsPerPage = actionCreator<{ id: string; itemsPerPage: number }>(
  'UPDATE_ITEMS_PER_PAGE'
);

export const updateItemsPerPageOptions = actionCreator<{
  id: string;
  itemsPerPageOptions: number[];
}>('UPDATE_ITEMS_PER_PAGE_OPTIONS');

export const updateTitle = actionCreator<{ id: string; title: string }>('UPDATE_TITLE');

export const updatePageIndex = actionCreator<{ id: string; activePage: number }>(
  'UPDATE_PAGE_INDEX'
);

export const updateProviders = actionCreator<{ id: string; providers: DataProvider[] }>(
  'UPDATE_PROVIDERS'
);

export const updateRange = actionCreator<{ id: string; start: number; end: number }>(
  'UPDATE_RANGE'
);

export const updateSort = actionCreator<{ id: string; sort: Sort }>('UPDATE_SORT');

export const updateAutoSaveMsg = actionCreator<{
  timelineId: string | null;
  newTimelineModel: TimelineModel | null;
}>('UPDATE_AUTO_SAVE');

export const showCallOutUnauthorizedMsg = actionCreator('SHOW_CALL_OUT_UNAUTHORIZED_MSG');

export const setSavedQueryId = actionCreator<{
  id: string;
  savedQueryId: string | null;
}>('SET_TIMELINE_SAVED_QUERY');

export const setFilters = actionCreator<{
  id: string;
  filters: esFilters.Filter[];
}>('SET_TIMELINE_FILTERS');
