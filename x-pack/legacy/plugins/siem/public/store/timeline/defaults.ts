/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction } from '../../graphql/types';
import { DEFAULT_TIMELINE_WIDTH } from '../../components/timeline/body/constants';
import { defaultHeaders } from '../../components/timeline/body/column_headers/default_headers';
import { SubsetTimelineModel, TimelineModel } from './model';

export const timelineDefaults: SubsetTimelineModel & Pick<TimelineModel, 'filters'> = {
  columns: defaultHeaders,
  dataProviders: [],
  deletedEventIds: [],
  description: '',
  eventType: 'all',
  eventIdToNoteIds: {},
  highlightedDropAndProviderId: '',
  historyIds: [],
  filters: [],
  isFavorite: false,
  isLive: false,
  isSelectAllChecked: false,
  isLoading: false,
  isSaving: false,
  itemsPerPage: 25,
  itemsPerPageOptions: [10, 25, 50, 100],
  kqlMode: 'filter',
  kqlQuery: {
    filterQuery: null,
    filterQueryDraft: null,
  },
  loadingEventIds: [],
  title: '',
  noteIds: [],
  pinnedEventIds: {},
  pinnedEventsSaveObject: {},
  dateRange: {
    start: 0,
    end: 0,
  },
  savedObjectId: null,
  selectedEventIds: {},
  show: false,
  showCheckboxes: false,
  showRowRenderers: true,
  sort: {
    columnId: '@timestamp',
    sortDirection: Direction.desc,
  },
  width: DEFAULT_TIMELINE_WIDTH,
  version: null,
};
