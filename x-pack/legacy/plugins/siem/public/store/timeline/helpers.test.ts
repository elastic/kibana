/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addTimelineToStore } from './helpers';
import { TimelineResult } from '../../graphql/types';
import { timelineDefaults } from './model';

describe('helpers', () => {
  test('should merge columns when event.action is deleted without two extra column names of user.name', () => {
    const timeline: TimelineResult = {
      savedObjectId: 'savedObject-1',
      columns: timelineDefaults.columns.filter(column => column.id !== 'event.action'),
      version: '1',
    };
    const newTimeline = addTimelineToStore({ id: 'timeline-1', timeline });
    expect(newTimeline).toEqual({
      'timeline-1': {
        savedObjectId: 'savedObject-1',
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
            width: 240,
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
        eventIdToNoteIds: {},
        highlightedDropAndProviderId: '',
        historyIds: [],
        isFavorite: false,
        isLive: false,
        isLoading: false,
        isSaving: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: null,
          filterQueryDraft: null,
        },
        title: '',
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        dateRange: {
          start: 0,
          end: 0,
        },
        show: true,
        sort: {
          columnId: '@timestamp',
          sortDirection: 'desc',
        },
        width: 1100,
        id: 'savedObject-1',
      },
    });
  });
});
