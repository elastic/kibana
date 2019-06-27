/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import * as runtimeTypes from 'io-ts';

import { unionWithNullType } from '../framework';
import { NoteSavedObjectToReturnRuntimeType } from '../note/types';
import { PinnedEventToReturnSavedObjectRuntimeType } from '../pinned_event/types';

/*
 *  ColumnHeader Types
 */
const SavedColumnHeaderRuntimeType = runtimeTypes.partial({
  aggregatable: unionWithNullType(runtimeTypes.boolean),
  category: unionWithNullType(runtimeTypes.string),
  columnHeaderType: unionWithNullType(runtimeTypes.string),
  description: unionWithNullType(runtimeTypes.string),
  example: unionWithNullType(runtimeTypes.string),
  indexes: unionWithNullType(runtimeTypes.array(runtimeTypes.string)),
  id: unionWithNullType(runtimeTypes.string),
  name: unionWithNullType(runtimeTypes.string),
  placeholder: unionWithNullType(runtimeTypes.string),
  searchable: unionWithNullType(runtimeTypes.boolean),
  type: unionWithNullType(runtimeTypes.string),
});

/*
 *  DataProvider Types
 */
const SavedDataProviderQueryMatchBasicRuntimeType = runtimeTypes.partial({
  field: unionWithNullType(runtimeTypes.string),
  displayField: unionWithNullType(runtimeTypes.string),
  value: unionWithNullType(runtimeTypes.string),
  displayValue: unionWithNullType(runtimeTypes.string),
  operator: unionWithNullType(runtimeTypes.string),
});

const SavedDataProviderQueryMatchRuntimeType = runtimeTypes.partial({
  id: unionWithNullType(runtimeTypes.string),
  name: unionWithNullType(runtimeTypes.string),
  enabled: unionWithNullType(runtimeTypes.boolean),
  excluded: unionWithNullType(runtimeTypes.boolean),
  kqlQuery: unionWithNullType(runtimeTypes.string),
  queryMatch: unionWithNullType(SavedDataProviderQueryMatchBasicRuntimeType),
});

const SavedDataProviderRuntimeType = runtimeTypes.partial({
  id: unionWithNullType(runtimeTypes.string),
  name: unionWithNullType(runtimeTypes.string),
  enabled: unionWithNullType(runtimeTypes.boolean),
  excluded: unionWithNullType(runtimeTypes.boolean),
  kqlQuery: unionWithNullType(runtimeTypes.string),
  queryMatch: unionWithNullType(SavedDataProviderQueryMatchBasicRuntimeType),
  and: unionWithNullType(runtimeTypes.array(SavedDataProviderQueryMatchRuntimeType)),
});

/*
 *  kqlQuery -> filterQuery Types
 */
const SavedKueryFilterQueryRuntimeType = runtimeTypes.partial({
  kind: unionWithNullType(runtimeTypes.string),
  expression: unionWithNullType(runtimeTypes.string),
});

const SavedSerializedFilterQueryQueryRuntimeType = runtimeTypes.partial({
  kuery: unionWithNullType(SavedKueryFilterQueryRuntimeType),
  serializedQuery: unionWithNullType(runtimeTypes.string),
});

const SavedFilterQueryQueryRuntimeType = runtimeTypes.partial({
  filterQuery: unionWithNullType(SavedSerializedFilterQueryQueryRuntimeType),
});

/*
 *  DatePicker Range Types
 */
const SavedDateRangePickerRuntimeType = runtimeTypes.partial({
  start: unionWithNullType(runtimeTypes.number),
  end: unionWithNullType(runtimeTypes.number),
});

/*
 *  Favorite Types
 */
const SavedFavoriteRuntimeType = runtimeTypes.partial({
  keySearch: unionWithNullType(runtimeTypes.string),
  favoriteDate: unionWithNullType(runtimeTypes.number),
  fullName: unionWithNullType(runtimeTypes.string),
  userName: unionWithNullType(runtimeTypes.string),
});

/*
 *  Sort Types
 */
const SavedSortRuntimeType = runtimeTypes.partial({
  columnId: unionWithNullType(runtimeTypes.string),
  sortDirection: unionWithNullType(runtimeTypes.string),
});

/*
 *  Timeline Types
 */
export const SavedTimelineRuntimeType = runtimeTypes.partial({
  columns: unionWithNullType(runtimeTypes.array(SavedColumnHeaderRuntimeType)),
  dataProviders: unionWithNullType(runtimeTypes.array(SavedDataProviderRuntimeType)),
  description: unionWithNullType(runtimeTypes.string),
  favorite: unionWithNullType(runtimeTypes.array(SavedFavoriteRuntimeType)),
  kqlMode: unionWithNullType(runtimeTypes.string),
  kqlQuery: unionWithNullType(SavedFilterQueryQueryRuntimeType),
  title: unionWithNullType(runtimeTypes.string),
  dateRange: unionWithNullType(SavedDateRangePickerRuntimeType),
  sort: unionWithNullType(SavedSortRuntimeType),
  created: unionWithNullType(runtimeTypes.number),
  createdBy: unionWithNullType(runtimeTypes.string),
  updated: unionWithNullType(runtimeTypes.number),
  updatedBy: unionWithNullType(runtimeTypes.string),
});

export interface SavedTimeline extends runtimeTypes.TypeOf<typeof SavedTimelineRuntimeType> {}

export interface SavedTimelineNote extends runtimeTypes.TypeOf<typeof SavedTimelineRuntimeType> {}

/**
 * Timeline Saved object type with metadata
 */

export const TimelineSavedObjectRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    id: runtimeTypes.string,
    attributes: SavedTimelineRuntimeType,
    version: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    savedObjectId: runtimeTypes.string,
  }),
]);

export const TimelineSavedToReturnObjectRuntimeType = runtimeTypes.intersection([
  SavedTimelineRuntimeType,
  runtimeTypes.type({
    savedObjectId: runtimeTypes.string,
    version: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    eventIdToNoteIds: runtimeTypes.array(NoteSavedObjectToReturnRuntimeType),
    noteIds: runtimeTypes.array(runtimeTypes.string),
    notes: runtimeTypes.array(NoteSavedObjectToReturnRuntimeType),
    pinnedEventIds: runtimeTypes.array(runtimeTypes.string),
    pinnedEventsSaveObject: runtimeTypes.array(PinnedEventToReturnSavedObjectRuntimeType),
  }),
]);

export interface TimelineSavedObject
  extends runtimeTypes.TypeOf<typeof TimelineSavedToReturnObjectRuntimeType> {}

/**
 * All Timeline Saved object type with metadata
 */

export const AllTimelineSavedObjectRuntimeType = runtimeTypes.type({
  total: runtimeTypes.number,
  data: TimelineSavedToReturnObjectRuntimeType,
});

export interface AllTimelineSavedObject
  extends runtimeTypes.TypeOf<typeof AllTimelineSavedObjectRuntimeType> {}
