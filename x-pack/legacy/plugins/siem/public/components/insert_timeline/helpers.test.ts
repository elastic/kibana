/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { cloneDeep, omit } from 'lodash/fp';

import { mockTimelineResults } from '../../mock/timeline_results';
import { timelineDefaults } from '../../store/timeline/defaults';
import { defaultTimelineToTimelineModel, isUntitled } from './helpers';
import { InsertTimelineResult } from './types';

describe('helpers', () => {
  let mockResults: InsertTimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  describe('#isUntitled', () => {
    test('returns true when title is undefined', () => {
      const titleIsUndefined = omit('title', {
        ...mockResults[0],
      });

      expect(isUntitled(titleIsUndefined)).toEqual(true);
    });

    test('returns true when title is null', () => {
      const titleIsNull = {
        ...mockResults[0],
        title: null,
      };

      expect(isUntitled(titleIsNull)).toEqual(true);
    });

    test('returns true when title is just whitespace', () => {
      const titleIsWitespace = {
        ...mockResults[0],
        title: '    ',
      };

      expect(isUntitled(titleIsWitespace)).toEqual(true);
    });

    test('returns false when title is surrounded by whitespace', () => {
      const titleIsWitespace = {
        ...mockResults[0],
        title: '  the king of the north  ',
      };

      expect(isUntitled(titleIsWitespace)).toEqual(false);
    });

    test('returns false when title is NOT surrounded by whitespace', () => {
      const titleIsWitespace = {
        ...mockResults[0],
        title: 'in the beginning...',
      };

      expect(isUntitled(titleIsWitespace)).toEqual(false);
    });
  });

  describe('#defaultTimelineToTimelineModel', () => {
    test('if title is null, we should get the default title', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        title: null,
        version: '1',
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false);
      expect(newTimeline).toEqual({
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            width: 190,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.action',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
            width: 180,
          },
        ],
        dataProviders: [],
        dateRange: {
          end: 0,
          start: 0,
        },
        description: '',
        deletedEventIds: [],
        eventIdToNoteIds: {},
        eventType: 'all',
        filters: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        id: 'savedObject-1',
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
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        savedObjectId: 'savedObject-1',
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        showRowRenderers: true,
        sort: {
          columnId: '@timestamp',
          sortDirection: 'desc',
        },
        title: '',
        version: '1',
        width: 1100,
      });
    });
    test('if columns are null, we should get the default columns', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        columns: null,
        version: '1',
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false);
      expect(newTimeline).toEqual({
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            width: 190,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.action',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
            width: 180,
          },
        ],
        dataProviders: [],
        dateRange: {
          end: 0,
          start: 0,
        },
        description: '',
        deletedEventIds: [],
        eventIdToNoteIds: {},
        eventType: 'all',
        filters: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        id: 'savedObject-1',
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
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        savedObjectId: 'savedObject-1',
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        showRowRenderers: true,
        sort: {
          columnId: '@timestamp',
          sortDirection: 'desc',
        },
        title: '',
        version: '1',
        width: 1100,
      });
    });
    test('should merge columns when event.action is deleted without two extra column names of user.name', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        columns: timelineDefaults.columns.filter(column => column.id !== 'event.action'),
        version: '1',
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false);
      expect(newTimeline).toEqual({
        savedObjectId: 'savedObject-1',
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            width: 190,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
            width: 180,
          },
        ],
        version: '1',
        dataProviders: [],
        description: '',
        deletedEventIds: [],
        eventIdToNoteIds: {},
        eventType: 'all',
        filters: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
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
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        showRowRenderers: true,
        sort: {
          columnId: '@timestamp',
          sortDirection: 'desc',
        },
        width: 1100,
        id: 'savedObject-1',
      });
    });

    test('should merge filters object back with json object', () => {
      const timeline = {
        savedObjectId: 'savedObject-1',
        columns: timelineDefaults.columns.filter(column => column.id !== 'event.action'),
        filters: [
          {
            meta: {
              alias: null,
              controlledBy: null,
              disabled: false,
              index: null,
              key: 'event.category',
              negate: false,
              params: '{"query":"file"}',
              type: 'phrase',
              value: null,
            },
            query: '{"match_phrase":{"event.category":"file"}}',
            exists: null,
          },
          {
            meta: {
              alias: null,
              controlledBy: null,
              disabled: false,
              index: null,
              key: '@timestamp',
              negate: false,
              params: null,
              type: 'exists',
              value: 'exists',
            },
            query: null,
            exists: '{"field":"@timestamp"}',
          },
        ],
        version: '1',
      };

      const newTimeline = defaultTimelineToTimelineModel(timeline, false);
      expect(newTimeline).toEqual({
        savedObjectId: 'savedObject-1',
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            width: 190,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
            width: 180,
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
            width: 180,
          },
        ],
        version: '1',
        dataProviders: [],
        description: '',
        deletedEventIds: [],
        eventIdToNoteIds: {},
        eventType: 'all',
        filters: [
          {
            $state: {
              store: 'appState',
            },
            meta: {
              alias: null,
              controlledBy: null,
              disabled: false,
              index: null,
              key: 'event.category',
              negate: false,
              params: {
                query: 'file',
              },
              type: 'phrase',
              value: null,
            },
            query: {
              match_phrase: {
                'event.category': 'file',
              },
            },
          },
          {
            $state: {
              store: 'appState',
            },
            exists: {
              field: '@timestamp',
            },
            meta: {
              alias: null,
              controlledBy: null,
              disabled: false,
              index: null,
              key: '@timestamp',
              negate: false,
              params: null,
              type: 'exists',
              value: 'exists',
            },
          },
        ],
        highlightedDropAndProviderId: '',
        historyIds: [],
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
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        showRowRenderers: true,
        sort: {
          columnId: '@timestamp',
          sortDirection: 'desc',
        },
        width: 1100,
        id: 'savedObject-1',
      });
    });
  });
});
