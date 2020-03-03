/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, set } from 'lodash/fp';

import {
  IS_OPERATOR,
  DataProvider,
  DataProvidersAnd,
} from '../../components/timeline/data_providers/data_provider';
import { defaultColumnHeaderType } from '../../components/timeline/body/column_headers/default_headers';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_TIMELINE_WIDTH,
} from '../../components/timeline/body/constants';
import { getColumnWidthFromType } from '../../components/timeline/body/column_headers/helpers';
import { Direction } from '../../graphql/types';
import { defaultHeaders } from '../../mock';

import {
  addNewTimeline,
  addTimelineProvider,
  addTimelineToStore,
  applyDeltaToTimelineColumnWidth,
  removeTimelineColumn,
  removeTimelineProvider,
  updateTimelineColumns,
  updateTimelineDescription,
  updateTimelineItemsPerPage,
  updateTimelinePerPageOptions,
  updateTimelineProviderEnabled,
  updateTimelineProviderExcluded,
  updateTimelineProviders,
  updateTimelineRange,
  updateTimelineShowTimeline,
  updateTimelineSort,
  updateTimelineTitle,
  upsertTimelineColumn,
} from './helpers';
import { ColumnHeaderOptions } from './model';
import { timelineDefaults } from './defaults';
import { TimelineById } from './types';

const timelineByIdMock: TimelineById = {
  foo: {
    dataProviders: [
      {
        and: [],
        id: '123',
        name: 'data provider 1',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },

        excluded: false,
        kqlQuery: '',
      },
    ],
    columns: [],
    description: '',
    deletedEventIds: [],
    eventIdToNoteIds: {},
    highlightedDropAndProviderId: '',
    historyIds: [],
    id: 'foo',
    savedObjectId: null,
    isFavorite: false,
    isLive: false,
    isSelectAllChecked: false,
    isLoading: false,
    itemsPerPage: 25,
    itemsPerPageOptions: [10, 25, 50],
    kqlMode: 'filter',
    kqlQuery: { filterQuery: null, filterQueryDraft: null },
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
    show: true,
    showCheckboxes: false,
    showRowRenderers: true,
    sort: {
      columnId: '@timestamp',
      sortDirection: Direction.desc,
    },
    width: DEFAULT_TIMELINE_WIDTH,
    isSaving: false,
    version: null,
  },
};

const columnsMock: ColumnHeaderOptions[] = [
  defaultHeaders[0],
  defaultHeaders[1],
  defaultHeaders[2],
];

describe('Timeline', () => {
  describe('#add saved object Timeline to store ', () => {
    test('should return a timelineModel with default value and not just a timelineResult ', () => {
      const update = addTimelineToStore({
        id: 'foo',
        timeline: {
          ...timelineByIdMock.foo,
        },
        timelineById: timelineByIdMock,
      });

      expect(update).toEqual({
        foo: {
          ...timelineByIdMock.foo,
          show: true,
        },
      });
    });
  });

  describe('#addNewTimeline', () => {
    test('should return a new reference and not the same reference', () => {
      const update = addNewTimeline({
        id: 'bar',
        columns: defaultHeaders,
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should add a new timeline', () => {
      const update = addNewTimeline({
        id: 'bar',
        columns: timelineDefaults.columns,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual({
        foo: timelineByIdMock.foo,
        bar: set('id', 'bar', timelineDefaults),
      });
    });

    test('should add the specified columns to the timeline', () => {
      const barWithEmptyColumns = set('id', 'bar', timelineDefaults);
      const barWithPopulatedColumns = set('columns', defaultHeaders, barWithEmptyColumns);

      const update = addNewTimeline({
        id: 'bar',
        columns: defaultHeaders,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual({
        foo: timelineByIdMock.foo,
        bar: barWithPopulatedColumns,
      });
    });
  });

  describe('#updateTimelineShowTimeline', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineShowTimeline({
        id: 'foo',
        show: false,
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should change show from true to false', () => {
      const update = updateTimelineShowTimeline({
        id: 'foo',
        show: false, // value we are changing from true to false
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.show', false, timelineByIdMock));
    });
  });

  describe('#upsertTimelineColumn', () => {
    let timelineById: TimelineById = {};
    let columns: ColumnHeaderOptions[] = [];
    let columnToAdd: ColumnHeaderOptions;

    beforeEach(() => {
      timelineById = cloneDeep(timelineByIdMock);
      columns = cloneDeep(columnsMock);
      columnToAdd = {
        category: 'event',
        columnHeaderType: defaultColumnHeaderType,
        description:
          'The action captured by the event.\nThis describes the information in the event. It is more specific than `event.category`. Examples are `group-add`, `process-started`, `file-created`. The value is normally defined by the implementer.',
        example: 'user-password-change',
        id: 'event.action',
        type: 'keyword',
        aggregatable: true,
        width: DEFAULT_COLUMN_MIN_WIDTH,
      };
    });

    test('should return a new reference and not the same reference', () => {
      const update = upsertTimelineColumn({
        column: columnToAdd,
        id: 'foo',
        index: 0,
        timelineById,
      });

      expect(update).not.toBe(timelineById);
    });

    test('should add a new column to an empty collection of columns', () => {
      const expectedColumns = [columnToAdd];
      const update = upsertTimelineColumn({
        column: columnToAdd,
        id: 'foo',
        index: 0,
        timelineById,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, timelineById));
    });

    test('should add a new column to an existing collection of columns at the beginning of the collection', () => {
      const expectedColumns = [columnToAdd, ...columns];
      const mockWithExistingColumns = set('foo.columns', columns, timelineById);

      const update = upsertTimelineColumn({
        column: columnToAdd,
        id: 'foo',
        index: 0,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should add a new column to an existing collection of columns in the middle of the collection', () => {
      const expectedColumns = [columns[0], columnToAdd, columns[1], columns[2]];
      const mockWithExistingColumns = set('foo.columns', columns, timelineById);

      const update = upsertTimelineColumn({
        column: columnToAdd,
        id: 'foo',
        index: 1,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should add a new column to an existing collection of columns at the end of the collection', () => {
      const expectedColumns = [...columns, columnToAdd];
      const mockWithExistingColumns = set('foo.columns', columns, timelineById);

      const update = upsertTimelineColumn({
        column: columnToAdd,
        id: 'foo',
        index: expectedColumns.length - 1,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    columns.forEach((column, i) => {
      test(`should upsert (NOT add a new column) a column when already exists at the same index (${i})`, () => {
        const mockWithExistingColumns = set('foo.columns', columns, timelineById);

        const update = upsertTimelineColumn({
          column,
          id: 'foo',
          index: i,
          timelineById: mockWithExistingColumns,
        });

        expect(update).toEqual(set('foo.columns', columns, mockWithExistingColumns));
      });
    });

    test('should allow the 1st column to be moved to the 2nd column', () => {
      const expectedColumns = [columns[1], columns[0], columns[2]];
      const mockWithExistingColumns = set('foo.columns', columns, timelineById);

      const update = upsertTimelineColumn({
        column: columns[0],
        id: 'foo',
        index: 1,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should allow the 1st column to be moved to the 3rd column', () => {
      const expectedColumns = [columns[1], columns[2], columns[0]];
      const mockWithExistingColumns = set('foo.columns', columns, timelineById);

      const update = upsertTimelineColumn({
        column: columns[0],
        id: 'foo',
        index: 2,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should allow the 2nd column to be moved to the 1st column', () => {
      const expectedColumns = [columns[1], columns[0], columns[2]];
      const mockWithExistingColumns = set('foo.columns', columns, timelineById);

      const update = upsertTimelineColumn({
        column: columns[1],
        id: 'foo',
        index: 0,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should allow the 2nd column to be moved to the 3rd column', () => {
      const expectedColumns = [columns[0], columns[2], columns[1]];
      const mockWithExistingColumns = set('foo.columns', columns, timelineById);

      const update = upsertTimelineColumn({
        column: columns[1],
        id: 'foo',
        index: 2,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should allow the 3rd column to be moved to the 1st column', () => {
      const expectedColumns = [columns[2], columns[0], columns[1]];
      const mockWithExistingColumns = set('foo.columns', columns, timelineById);

      const update = upsertTimelineColumn({
        column: columns[2],
        id: 'foo',
        index: 0,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should allow the 3rd column to be moved to the 2nd column', () => {
      const expectedColumns = [columns[0], columns[2], columns[1]];
      const mockWithExistingColumns = set('foo.columns', columns, timelineById);

      const update = upsertTimelineColumn({
        column: columns[2],
        id: 'foo',
        index: 1,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });
  });

  describe('#addTimelineProvider', () => {
    test('should return a new reference and not the same reference', () => {
      const update = addTimelineProvider({
        id: 'foo',
        provider: {
          and: [],
          id: '567',
          name: 'data provider 2',
          enabled: true,
          queryMatch: {
            field: '',
            value: '',
            operator: IS_OPERATOR,
          },

          excluded: false,
          kqlQuery: '',
        },
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should add a new timeline provider', () => {
      const providerToAdd: DataProvider = {
        and: [],
        id: '567',
        name: 'data provider 2',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },

        excluded: false,
        kqlQuery: '',
      };
      const update = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });
      const addedDataProvider = timelineByIdMock.foo.dataProviders.concat(providerToAdd);
      expect(update).toEqual(set('foo.dataProviders', addedDataProvider, timelineByIdMock));
    });

    test('should NOT add a new timeline provider if it already exists and the attributes "and" is empty', () => {
      const providerToAdd: DataProvider = {
        and: [],
        id: '123',
        name: 'data provider 1',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },

        excluded: false,
        kqlQuery: '',
      };
      const update = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(timelineByIdMock);
    });

    test('should add a new timeline provider if it already exists and the attributes "and" is NOT empty', () => {
      const myMockTimelineByIdMock = cloneDeep(timelineByIdMock);
      myMockTimelineByIdMock.foo.dataProviders[0].and = [
        {
          id: '456',
          name: 'and data provider 1',
          enabled: true,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field: '',
            value: '',
            operator: IS_OPERATOR,
          },
        },
      ];
      const providerToAdd: DataProvider = {
        and: [],
        id: '123',
        name: 'data provider 1',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },

        excluded: false,
        kqlQuery: '',
      };
      const update = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: myMockTimelineByIdMock,
      });
      expect(update).toEqual(set('foo.dataProviders[1]', providerToAdd, myMockTimelineByIdMock));
    });

    test('should UPSERT an existing timeline provider if it already exists', () => {
      const providerToAdd: DataProvider = {
        and: [],
        id: '123',
        name: 'my name changed',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },
        excluded: false,
        kqlQuery: '',
      };
      const update = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.dataProviders[0].name', 'my name changed', timelineByIdMock));
    });
  });

  describe('#removeTimelineColumn', () => {
    test('should return a new reference and not the same reference', () => {
      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = removeTimelineColumn({
        id: 'foo',
        columnId: columnsMock[0].id,
        timelineById: mockWithExistingColumns,
      });

      expect(update).not.toBe(timelineByIdMock);
    });

    test('should remove just the first column when the id matches', () => {
      const expectedColumns = [columnsMock[1], columnsMock[2]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = removeTimelineColumn({
        id: 'foo',
        columnId: columnsMock[0].id,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should remove just the last column when the id matches', () => {
      const expectedColumns = [columnsMock[0], columnsMock[1]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = removeTimelineColumn({
        id: 'foo',
        columnId: columnsMock[2].id,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should remove just the middle column when the id matches', () => {
      const expectedColumns = [columnsMock[0], columnsMock[2]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = removeTimelineColumn({
        id: 'foo',
        columnId: columnsMock[1].id,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should not modify the columns if the id to remove was not found', () => {
      const expectedColumns = cloneDeep(columnsMock);

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = removeTimelineColumn({
        id: 'foo',
        columnId: 'does.not.exist',
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });
  });

  describe('#applyDeltaToColumnWidth', () => {
    test('should return a new reference and not the same reference', () => {
      const delta = 50;
      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = applyDeltaToTimelineColumnWidth({
        id: 'foo',
        columnId: columnsMock[0].id,
        delta,
        timelineById: mockWithExistingColumns,
      });

      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update (just) the specified column of type `date` when the id matches, and the result of applying the delta is greater than the min width for a date column', () => {
      const aDateColumn = columnsMock[0];
      const delta = 50;
      const expectedToHaveNewWidth = {
        ...aDateColumn,
        width: getColumnWidthFromType(aDateColumn.type!) + delta,
      };
      const expectedColumns = [expectedToHaveNewWidth, columnsMock[1], columnsMock[2]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = applyDeltaToTimelineColumnWidth({
        id: 'foo',
        columnId: aDateColumn.id,
        delta,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should NOT update (just) the specified column of type `date` when the id matches, because the result of applying the delta is less than the min width for a date column', () => {
      const aDateColumn = columnsMock[0];
      const delta = -50; // this will be less than the min
      const expectedToHaveNewWidth = {
        ...aDateColumn,
        width: getColumnWidthFromType(aDateColumn.type!), // we expect the minimum
      };
      const expectedColumns = [expectedToHaveNewWidth, columnsMock[1], columnsMock[2]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = applyDeltaToTimelineColumnWidth({
        id: 'foo',
        columnId: aDateColumn.id,
        delta,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should update (just) the specified non-date column when the id matches, and the result of applying the delta is greater than the min width for the column', () => {
      const aNonDateColumn = columnsMock[1];
      const delta = 50;
      const expectedToHaveNewWidth = {
        ...aNonDateColumn,
        width: getColumnWidthFromType(aNonDateColumn.type!) + delta,
      };
      const expectedColumns = [columnsMock[0], expectedToHaveNewWidth, columnsMock[2]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = applyDeltaToTimelineColumnWidth({
        id: 'foo',
        columnId: aNonDateColumn.id,
        delta,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });

    test('should NOT update the specified non-date column when the id matches, because the result of applying the delta is less than the min width for the column', () => {
      const aNonDateColumn = columnsMock[1];
      const delta = -50;
      const expectedToHaveNewWidth = {
        ...aNonDateColumn,
        width: getColumnWidthFromType(aNonDateColumn.type!),
      };
      const expectedColumns = [columnsMock[0], expectedToHaveNewWidth, columnsMock[2]];

      // pre-populate a new mock with existing columns:
      const mockWithExistingColumns = set('foo.columns', columnsMock, timelineByIdMock);

      const update = applyDeltaToTimelineColumnWidth({
        id: 'foo',
        columnId: aNonDateColumn.id,
        delta,
        timelineById: mockWithExistingColumns,
      });

      expect(update).toEqual(set('foo.columns', expectedColumns, mockWithExistingColumns));
    });
  });

  describe('#addAndProviderToTimelineProvider', () => {
    test('should add a new and provider to an existing timeline provider', () => {
      const providerToAdd: DataProvider = {
        and: [],
        id: '567',
        name: 'data provider 2',
        enabled: true,
        queryMatch: {
          field: 'handsome',
          value: 'garrett',
          operator: IS_OPERATOR,
        },
        excluded: false,
        kqlQuery: '',
      };

      const newTimeline = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });

      newTimeline.foo.highlightedDropAndProviderId = '567';

      const andProviderToAdd: DataProvider = {
        and: [],
        id: '568',
        name: 'And Data Provider',
        enabled: true,
        queryMatch: {
          field: 'smart',
          value: 'frank',
          operator: IS_OPERATOR,
        },

        excluded: false,
        kqlQuery: '',
      };

      const update = addTimelineProvider({
        id: 'foo',
        provider: andProviderToAdd,
        timelineById: newTimeline,
      });
      const indexProvider = update.foo.dataProviders.findIndex(i => i.id === '567');
      const addedAndDataProvider = update.foo.dataProviders[indexProvider].and[0];
      const { and, ...expectedResult } = andProviderToAdd;
      expect(addedAndDataProvider).toEqual(expectedResult);
      newTimeline.foo.highlightedDropAndProviderId = '';
    });

    test('should add another and provider because it is not a duplicate', () => {
      const providerToAdd: DataProvider = {
        and: [
          {
            id: '568',
            name: 'And Data Provider',
            enabled: true,
            queryMatch: {
              field: 'smart',
              value: 'garrett',
              operator: IS_OPERATOR,
            },
            excluded: false,
            kqlQuery: '',
          },
        ],
        id: '567',
        name: 'data provider 1',
        enabled: true,
        queryMatch: {
          field: 'handsome',
          value: 'frank',
          operator: IS_OPERATOR,
        },
        excluded: false,
        kqlQuery: '',
      };

      const newTimeline = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });

      newTimeline.foo.highlightedDropAndProviderId = '567';

      const andProviderToAdd: DataProvider = {
        and: [],
        id: '569',
        name: 'And Data Provider',
        enabled: true,
        queryMatch: {
          field: 'happy',
          value: 'andrewG',
          operator: IS_OPERATOR,
        },
        excluded: false,
        kqlQuery: '',
      };
      // temporary, we will have to decouple DataProvider & DataProvidersAnd
      // that's bigger a refactor than just fixing a bug
      delete andProviderToAdd.and;
      const update = addTimelineProvider({
        id: 'foo',
        provider: andProviderToAdd,
        timelineById: newTimeline,
      });

      expect(update).toEqual(set('foo.dataProviders[1].and[1]', andProviderToAdd, newTimeline));
      newTimeline.foo.highlightedDropAndProviderId = '';
    });

    test('should NOT add another and provider because it is a duplicate', () => {
      const providerToAdd: DataProvider = {
        and: [
          {
            id: '568',
            name: 'And Data Provider',
            enabled: true,
            queryMatch: {
              field: 'smart',
              value: 'garrett',
              operator: IS_OPERATOR,
            },
            excluded: false,
            kqlQuery: '',
          },
        ],
        id: '567',
        name: 'data provider 1',
        enabled: true,
        queryMatch: {
          field: 'handsome',
          value: 'frank',
          operator: IS_OPERATOR,
        },
        excluded: false,
        kqlQuery: '',
      };

      const newTimeline = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });

      newTimeline.foo.highlightedDropAndProviderId = '567';

      const andProviderToAdd: DataProvider = {
        and: [],
        id: '569',
        name: 'And Data Provider',
        enabled: true,
        queryMatch: {
          field: 'smart',
          value: 'garrett',
          operator: IS_OPERATOR,
        },
        excluded: false,
        kqlQuery: '',
      };
      const update = addTimelineProvider({
        id: 'foo',
        provider: andProviderToAdd,
        timelineById: newTimeline,
      });

      expect(update).toEqual(newTimeline);
      newTimeline.foo.highlightedDropAndProviderId = '';
    });
  });

  describe('#updateTimelineColumns', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineColumns({
        id: 'foo',
        columns: columnsMock,
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update a timeline with new columns', () => {
      const update = updateTimelineColumns({
        id: 'foo',
        columns: columnsMock,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.columns', [...columnsMock], timelineByIdMock));
    });
  });

  describe('#updateTimelineDescription', () => {
    const newDescription = 'a new description';

    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineDescription({
        id: 'foo',
        description: newDescription,
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update the timeline description', () => {
      const update = updateTimelineDescription({
        id: 'foo',
        description: newDescription,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.description', newDescription, timelineByIdMock));
    });

    test('should always trim all leading whitespace and allow only one trailing space', () => {
      const update = updateTimelineDescription({
        id: 'foo',
        description: '      breathing room      ',
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.description', 'breathing room ', timelineByIdMock));
    });
  });

  describe('#updateTimelineTitle', () => {
    const newTitle = 'a new title';

    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineTitle({
        id: 'foo',
        title: newTitle,
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update the timeline title', () => {
      const update = updateTimelineTitle({
        id: 'foo',
        title: newTitle,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.title', newTitle, timelineByIdMock));
    });

    test('should always trim all leading whitespace and allow only one trailing space', () => {
      const update = updateTimelineTitle({
        id: 'foo',
        title: '      room at the back      ',
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.title', 'room at the back ', timelineByIdMock));
    });
  });

  describe('#updateTimelineProviders', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineProviders({
        id: 'foo',
        providers: [
          {
            and: [],
            id: '567',
            name: 'data provider 2',
            enabled: true,
            queryMatch: {
              field: '',
              value: '',
              operator: IS_OPERATOR,
            },

            excluded: false,
            kqlQuery: '',
          },
        ],
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should add update a timeline with new providers', () => {
      const providerToAdd: DataProvider = {
        and: [],
        id: '567',
        name: 'data provider 2',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },

        excluded: false,
        kqlQuery: '',
      };
      const update = updateTimelineProviders({
        id: 'foo',
        providers: [providerToAdd],
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.dataProviders', [providerToAdd], timelineByIdMock));
    });
  });

  describe('#updateTimelineRange', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineRange({
        id: 'foo',
        start: 23,
        end: 33,
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update the timeline range', () => {
      const update = updateTimelineRange({
        id: 'foo',
        start: 23,
        end: 33,
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(
        set(
          'foo.dateRange',
          {
            start: 23,
            end: 33,
          },
          timelineByIdMock
        )
      );
    });
  });

  describe('#updateTimelineSort', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineSort({
        id: 'foo',
        sort: {
          columnId: 'some column',
          sortDirection: Direction.desc,
        },
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update the timeline range', () => {
      const update = updateTimelineSort({
        id: 'foo',
        sort: {
          columnId: 'some column',
          sortDirection: Direction.desc,
        },
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(
        set(
          'foo.sort',
          { columnId: 'some column', sortDirection: Direction.desc },
          timelineByIdMock
        )
      );
    });
  });

  describe('#updateTimelineProviderEnabled', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '123',
        enabled: false, // value we are updating from true to false
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should return a new reference for data provider and not the same reference of data provider', () => {
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '123',
        enabled: false, // value we are updating from true to false
        timelineById: timelineByIdMock,
      });
      expect(update.foo.dataProviders).not.toBe(timelineByIdMock.foo.dataProviders);
    });

    test('should update the timeline provider enabled from true to false', () => {
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '123',
        enabled: false, // value we are updating from true to false
        timelineById: timelineByIdMock,
      });
      const expected: TimelineById = {
        foo: {
          id: 'foo',
          savedObjectId: null,
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: false, // This value changed from true to false
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: '',
                value: '',
                operator: IS_OPERATOR,
              },
            },
          ],
          deletedEventIds: [],
          description: '',
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          isSelectAllChecked: false,
          isLoading: false,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          loadingEventIds: [],
          title: '',
          noteIds: [],
          dateRange: {
            start: 0,
            end: 0,
          },
          selectedEventIds: {},
          show: true,
          showRowRenderers: true,
          showCheckboxes: false,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          pinnedEventsSaveObject: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: DEFAULT_TIMELINE_WIDTH,
          isSaving: false,
          version: null,
        },
      };
      expect(update).toEqual(expected);
    });

    test('should update only one data provider and not two data providers', () => {
      const multiDataProvider = timelineByIdMock.foo.dataProviders.concat({
        and: [],
        id: '456',
        name: 'data provider 1',
        enabled: true,
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },
      });
      const multiDataProviderMock = set('foo.dataProviders', multiDataProvider, timelineByIdMock);
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '123',
        enabled: false, // value we are updating from true to false
        timelineById: multiDataProviderMock,
      });
      const expected: TimelineById = {
        foo: {
          id: 'foo',
          savedObjectId: null,
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: false, // value we are updating from true to false
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: '',
                value: '',
                operator: IS_OPERATOR,
              },
            },
            {
              and: [],
              id: '456',
              name: 'data provider 1',
              enabled: true,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: '',
                value: '',
                operator: IS_OPERATOR,
              },
            },
          ],
          description: '',
          deletedEventIds: [],
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          isSelectAllChecked: false,
          isLoading: false,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          loadingEventIds: [],
          title: '',
          noteIds: [],
          dateRange: {
            start: 0,
            end: 0,
          },
          selectedEventIds: {},
          show: true,
          showRowRenderers: true,
          showCheckboxes: false,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          pinnedEventsSaveObject: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: DEFAULT_TIMELINE_WIDTH,
          isSaving: false,
          version: null,
        },
      };
      expect(update).toEqual(expected);
    });
  });

  describe('#updateTimelineAndProviderEnabled', () => {
    let timelineByIdwithAndMock: TimelineById = timelineByIdMock;
    beforeEach(() => {
      const providerToAdd: DataProvider = {
        and: [
          {
            id: '568',
            name: 'And Data Provider',
            enabled: true,
            queryMatch: {
              field: '',
              value: '',
              operator: IS_OPERATOR,
            },

            excluded: false,
            kqlQuery: '',
          },
        ],
        id: '567',
        name: 'data provider 1',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },

        excluded: false,
        kqlQuery: '',
      };

      timelineByIdwithAndMock = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });
    });

    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '567',
        enabled: false, // value we are updating from true to false
        timelineById: timelineByIdwithAndMock,
        andProviderId: '568',
      });
      expect(update).not.toBe(timelineByIdwithAndMock);
    });

    test('should return a new reference for and data provider and not the same reference of data and provider', () => {
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '567',
        enabled: false, // value we are updating from true to false
        timelineById: timelineByIdwithAndMock,
        andProviderId: '568',
      });
      expect(update.foo.dataProviders).not.toBe(timelineByIdMock.foo.dataProviders);
    });

    test('should update the timeline and provider enabled from true to false', () => {
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '567',
        enabled: false, // value we are updating from true to false
        timelineById: timelineByIdwithAndMock,
        andProviderId: '568',
      });
      const indexProvider = update.foo.dataProviders.findIndex(i => i.id === '567');
      expect(update.foo.dataProviders[indexProvider].and[0].enabled).toEqual(false);
    });

    test('should update only one and data provider and not two and data providers', () => {
      const indexProvider = timelineByIdwithAndMock.foo.dataProviders.findIndex(
        i => i.id === '567'
      );
      const multiAndDataProvider = timelineByIdwithAndMock.foo.dataProviders[
        indexProvider
      ].and.concat({
        id: '456',
        name: 'new and data provider',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },

        excluded: false,
        kqlQuery: '',
      });
      const multiAndDataProviderMock = set(
        `foo.dataProviders[${indexProvider}].and`,
        multiAndDataProvider,
        timelineByIdwithAndMock
      );
      const update = updateTimelineProviderEnabled({
        id: 'foo',
        providerId: '567',
        enabled: false, // value we are updating from true to false
        timelineById: multiAndDataProviderMock,
        andProviderId: '568',
      });
      const oldAndProvider = update.foo.dataProviders[indexProvider].and.find(i => i.id === '568');
      const newAndProvider = update.foo.dataProviders[indexProvider].and.find(i => i.id === '456');
      expect(oldAndProvider!.enabled).toEqual(false);
      expect(newAndProvider!.enabled).toEqual(true);
    });
  });

  describe('#updateTimelineProviderExcluded', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '123',
        excluded: true, // value we are updating from false to true
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should return a new reference for data provider and not the same reference of data provider', () => {
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '123',
        excluded: true, // value we are updating from false to true
        timelineById: timelineByIdMock,
      });
      expect(update.foo.dataProviders).not.toBe(timelineByIdMock.foo.dataProviders);
    });

    test('should update the timeline provider excluded from true to false', () => {
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '123',
        excluded: true, // value we are updating from false to true
        timelineById: timelineByIdMock,
      });
      const expected: TimelineById = {
        foo: {
          id: 'foo',
          savedObjectId: null,
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: true,
              excluded: true, // This value changed from true to false
              kqlQuery: '',
              queryMatch: {
                field: '',
                value: '',
                operator: IS_OPERATOR,
              },
            },
          ],
          description: '',
          deletedEventIds: [],
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          isSelectAllChecked: false,
          isLoading: false,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          loadingEventIds: [],
          title: '',
          noteIds: [],
          dateRange: {
            start: 0,
            end: 0,
          },
          selectedEventIds: {},
          show: true,
          showRowRenderers: true,
          showCheckboxes: false,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          pinnedEventsSaveObject: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: DEFAULT_TIMELINE_WIDTH,
          isSaving: false,
          version: null,
        },
      };
      expect(update).toEqual(expected);
    });

    test('should update only one data provider and not two data providers', () => {
      const multiDataProvider = timelineByIdMock.foo.dataProviders.concat({
        and: [],
        id: '456',
        name: 'data provider 1',
        enabled: true,
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },
      });
      const multiDataProviderMock = set('foo.dataProviders', multiDataProvider, timelineByIdMock);
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '123',
        excluded: true, // value we are updating from false to true
        timelineById: multiDataProviderMock,
      });
      const expected: TimelineById = {
        foo: {
          id: 'foo',
          savedObjectId: null,
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: true,
              excluded: true, // value we are updating from false to true
              kqlQuery: '',
              queryMatch: {
                field: '',
                value: '',
                operator: IS_OPERATOR,
              },
            },
            {
              and: [],
              id: '456',
              name: 'data provider 1',
              enabled: true,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: '',
                value: '',
                operator: IS_OPERATOR,
              },
            },
          ],
          description: '',
          deletedEventIds: [],
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          isSelectAllChecked: false,
          isLoading: false,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          loadingEventIds: [],
          title: '',
          noteIds: [],
          dateRange: {
            start: 0,
            end: 0,
          },
          selectedEventIds: {},
          show: true,
          showRowRenderers: true,
          showCheckboxes: false,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          pinnedEventsSaveObject: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: DEFAULT_TIMELINE_WIDTH,
          isSaving: false,
          version: null,
        },
      };
      expect(update).toEqual(expected);
    });
  });

  describe('#updateTimelineAndProviderExcluded', () => {
    let timelineByIdwithAndMock: TimelineById = timelineByIdMock;
    beforeEach(() => {
      const providerToAdd: DataProvider = {
        and: [
          {
            id: '568',
            name: 'And Data Provider',
            enabled: true,
            queryMatch: {
              field: '',
              value: '',
              operator: IS_OPERATOR,
            },

            excluded: false,
            kqlQuery: '',
          },
        ],
        id: '567',
        name: 'data provider 1',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },

        excluded: false,
        kqlQuery: '',
      };

      timelineByIdwithAndMock = addTimelineProvider({
        id: 'foo',
        provider: providerToAdd,
        timelineById: timelineByIdMock,
      });
    });

    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '567',
        excluded: true, // value we are updating from true to false
        timelineById: timelineByIdwithAndMock,
        andProviderId: '568',
      });
      expect(update).not.toBe(timelineByIdwithAndMock);
    });

    test('should return a new reference for and data provider and not the same reference of data and provider', () => {
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '567',
        excluded: true, // value we are updating from false to true
        timelineById: timelineByIdwithAndMock,
        andProviderId: '568',
      });
      expect(update.foo.dataProviders).not.toBe(timelineByIdMock.foo.dataProviders);
    });

    test('should update the timeline and provider excluded from true to false', () => {
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '567',
        excluded: true, // value we are updating from true to false
        timelineById: timelineByIdwithAndMock,
        andProviderId: '568',
      });
      const indexProvider = update.foo.dataProviders.findIndex(i => i.id === '567');
      expect(update.foo.dataProviders[indexProvider].and[0].enabled).toEqual(true);
    });

    test('should update only one and data provider and not two and data providers', () => {
      const indexProvider = timelineByIdwithAndMock.foo.dataProviders.findIndex(
        i => i.id === '567'
      );
      const multiAndDataProvider = timelineByIdwithAndMock.foo.dataProviders[
        indexProvider
      ].and.concat({
        id: '456',
        name: 'new and data provider',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },

        excluded: false,
        kqlQuery: '',
      });
      const multiAndDataProviderMock = set(
        `foo.dataProviders[${indexProvider}].and`,
        multiAndDataProvider,
        timelineByIdwithAndMock
      );
      const update = updateTimelineProviderExcluded({
        id: 'foo',
        providerId: '567',
        excluded: true, // value we are updating from true to false
        timelineById: multiAndDataProviderMock,
        andProviderId: '568',
      });
      const oldAndProvider = update.foo.dataProviders[indexProvider].and.find(i => i.id === '568');
      const newAndProvider = update.foo.dataProviders[indexProvider].and.find(i => i.id === '456');
      expect(oldAndProvider!.excluded).toEqual(true);
      expect(newAndProvider!.excluded).toEqual(false);
    });
  });

  describe('#updateTimelineItemsPerPage', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelineItemsPerPage({
        id: 'foo',
        itemsPerPage: 10, // value we are updating from 5 to 10
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update the items per page from 25 to 50', () => {
      const update = updateTimelineItemsPerPage({
        id: 'foo',
        itemsPerPage: 50, // value we are updating from 25 to 50
        timelineById: timelineByIdMock,
      });
      const expected: TimelineById = {
        foo: {
          id: 'foo',
          savedObjectId: null,
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: true,
              queryMatch: {
                field: '',
                value: '',
                operator: IS_OPERATOR,
              },

              excluded: false,
              kqlQuery: '',
            },
          ],
          description: '',
          deletedEventIds: [],
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          isSelectAllChecked: false,
          isLoading: false,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          loadingEventIds: [],
          title: '',
          noteIds: [],
          dateRange: {
            start: 0,
            end: 0,
          },
          selectedEventIds: {},
          show: true,
          showRowRenderers: true,
          showCheckboxes: false,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          pinnedEventsSaveObject: {},
          itemsPerPage: 50,
          itemsPerPageOptions: [10, 25, 50],
          width: DEFAULT_TIMELINE_WIDTH,
          isSaving: false,
          version: null,
        },
      };
      expect(update).toEqual(expected);
    });
  });

  describe('#updateTimelinePerPageOptions', () => {
    test('should return a new reference and not the same reference', () => {
      const update = updateTimelinePerPageOptions({
        id: 'foo',
        itemsPerPageOptions: [100, 200, 300], // value we are updating from [5, 10, 20]
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should update the items per page options from [10, 25, 50] to [100, 200, 300]', () => {
      const update = updateTimelinePerPageOptions({
        id: 'foo',
        itemsPerPageOptions: [100, 200, 300], // value we are updating from [10, 25, 50]
        timelineById: timelineByIdMock,
      });
      const expected: TimelineById = {
        foo: {
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '123',
              name: 'data provider 1',
              enabled: true,
              queryMatch: {
                field: '',
                value: '',
                operator: IS_OPERATOR,
              },

              excluded: false,
              kqlQuery: '',
            },
          ],
          description: '',
          deletedEventIds: [],
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          isSelectAllChecked: false,
          isLoading: false,
          id: 'foo',
          savedObjectId: null,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          loadingEventIds: [],
          title: '',
          noteIds: [],
          dateRange: {
            start: 0,
            end: 0,
          },
          selectedEventIds: {},
          show: true,
          showRowRenderers: true,
          showCheckboxes: false,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          pinnedEventsSaveObject: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [100, 200, 300], // updated
          width: DEFAULT_TIMELINE_WIDTH,
          isSaving: false,
          version: null,
        },
      };
      expect(update).toEqual(expected);
    });
  });

  describe('#removeTimelineProvider', () => {
    test('should return a new reference and not the same reference', () => {
      const update = removeTimelineProvider({
        id: 'foo',
        providerId: '123',
        timelineById: timelineByIdMock,
      });
      expect(update).not.toBe(timelineByIdMock);
    });

    test('should remove a timeline provider', () => {
      const update = removeTimelineProvider({
        id: 'foo',
        providerId: '123',
        timelineById: timelineByIdMock,
      });
      expect(update).toEqual(set('foo.dataProviders', [], timelineByIdMock));
    });

    test('should remove only one data provider and not two data providers', () => {
      const multiDataProvider = timelineByIdMock.foo.dataProviders.concat({
        and: [],
        id: '456',
        name: 'data provider 2',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },

        excluded: false,
        kqlQuery: '',
      });
      const multiDataProviderMock = set('foo.dataProviders', multiDataProvider, timelineByIdMock);
      const update = removeTimelineProvider({
        id: 'foo',
        providerId: '123',
        timelineById: multiDataProviderMock,
      });
      const expected: TimelineById = {
        foo: {
          columns: [],
          dataProviders: [
            {
              and: [],
              id: '456',
              name: 'data provider 2',
              enabled: true,
              queryMatch: {
                field: '',
                value: '',
                operator: IS_OPERATOR,
              },

              excluded: false,
              kqlQuery: '',
            },
          ],
          description: '',
          deletedEventIds: [],
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          id: 'foo',
          savedObjectId: null,
          isFavorite: false,
          isLive: false,
          isSelectAllChecked: false,
          isLoading: false,
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null, filterQueryDraft: null },
          loadingEventIds: [],
          title: '',
          noteIds: [],
          dateRange: {
            start: 0,
            end: 0,
          },
          selectedEventIds: {},
          show: true,
          showRowRenderers: true,
          showCheckboxes: false,
          sort: {
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          },
          pinnedEventIds: {},
          pinnedEventsSaveObject: {},
          itemsPerPage: 25,
          itemsPerPageOptions: [10, 25, 50],
          width: DEFAULT_TIMELINE_WIDTH,
          isSaving: false,
          version: null,
        },
      };
      expect(update).toEqual(expected);
    });

    test('should remove only first provider and not nested andProvider', () => {
      const dataProviders: DataProvider[] = [
        {
          and: [],
          id: '111',
          name: 'data provider 1',
          enabled: true,
          queryMatch: {
            field: '',
            value: '',
            operator: IS_OPERATOR,
          },

          excluded: false,
          kqlQuery: '',
        },
        {
          and: [],
          id: '222',
          name: 'data provider 2',
          enabled: true,
          queryMatch: {
            field: '',
            value: '',
            operator: IS_OPERATOR,
          },

          excluded: false,
          kqlQuery: '',
        },
        {
          and: [],
          id: '333',
          name: 'data provider 3',
          enabled: true,
          queryMatch: {
            field: '',
            value: '',
            operator: IS_OPERATOR,
          },

          excluded: false,
          kqlQuery: '',
        },
      ];

      const multiDataProviderMock = set('foo.dataProviders', dataProviders, timelineByIdMock);

      const andDataProvider: DataProvidersAnd = {
        id: '211',
        name: 'And Data Provider',
        enabled: true,
        queryMatch: {
          field: '',
          value: '',
          operator: IS_OPERATOR,
        },

        excluded: false,
        kqlQuery: '',
      };

      const nestedMultiAndDataProviderMock = set(
        'foo.dataProviders[1].and',
        [andDataProvider],
        multiDataProviderMock
      );

      const update = removeTimelineProvider({
        id: 'foo',
        providerId: '222',
        timelineById: nestedMultiAndDataProviderMock,
      });
      expect(update).toEqual(
        set(
          'foo.dataProviders',
          [
            nestedMultiAndDataProviderMock.foo.dataProviders[0],
            { ...andDataProvider, and: [] },
            nestedMultiAndDataProviderMock.foo.dataProviders[2],
          ],
          timelineByIdMock
        )
      );
    });

    test('should remove only the first provider and keep multiple nested andProviders', () => {
      const multiDataProvider: DataProvider[] = [
        {
          and: [
            {
              enabled: true,
              id: 'socket_closed-MSoH7GoB9v5HJNSHRYj1-user_name-root',
              name: 'root',
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'user.name',
                value: 'root',
                operator: ':',
              },
            },
            {
              enabled: true,
              id: 'executed-yioH7GoB9v5HJNSHKnp5-auditd_result-success',
              name: 'success',
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'auditd.result',
                value: 'success',
                operator: ':',
              },
            },
          ],
          enabled: true,
          excluded: false,
          id: 'hosts-table-hostName-suricata-iowa',
          name: 'suricata-iowa',
          kqlQuery: '',
          queryMatch: {
            field: 'host.name',
            value: 'suricata-iowa',
            operator: ':',
          },
        },
      ];

      const multiDataProviderMock = set('foo.dataProviders', multiDataProvider, timelineByIdMock);

      const update = removeTimelineProvider({
        id: 'foo',
        providerId: 'hosts-table-hostName-suricata-iowa',
        timelineById: multiDataProviderMock,
      });

      expect(update).toEqual(
        set(
          'foo.dataProviders',
          [
            {
              enabled: true,
              id: 'socket_closed-MSoH7GoB9v5HJNSHRYj1-user_name-root',
              name: 'root',
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'user.name',
                value: 'root',
                operator: ':',
              },
              and: [
                {
                  enabled: true,
                  id: 'executed-yioH7GoB9v5HJNSHKnp5-auditd_result-success',
                  name: 'success',
                  excluded: false,
                  kqlQuery: '',
                  queryMatch: {
                    field: 'auditd.result',
                    value: 'success',
                    operator: ':',
                  },
                },
              ],
            },
          ],
          timelineByIdMock
        )
      );
    });
    test('should remove only the first AND provider when the first AND is deleted, and there are multiple andProviders', () => {
      const multiDataProvider: DataProvider[] = [
        {
          and: [
            {
              enabled: true,
              id: 'socket_closed-MSoH7GoB9v5HJNSHRYj1-user_name-root',
              name: 'root',
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'user.name',
                value: 'root',
                operator: ':',
              },
            },
            {
              enabled: true,
              id: 'executed-yioH7GoB9v5HJNSHKnp5-auditd_result-success',
              name: 'success',
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'auditd.result',
                value: 'success',
                operator: ':',
              },
            },
          ],
          enabled: true,
          excluded: false,
          id: 'hosts-table-hostName-suricata-iowa',
          name: 'suricata-iowa',
          kqlQuery: '',
          queryMatch: {
            field: 'host.name',
            value: 'suricata-iowa',
            operator: ':',
          },
        },
      ];

      const multiDataProviderMock = set('foo.dataProviders', multiDataProvider, timelineByIdMock);

      const update = removeTimelineProvider({
        andProviderId: 'socket_closed-MSoH7GoB9v5HJNSHRYj1-user_name-root',
        id: 'foo',
        providerId: 'hosts-table-hostName-suricata-iowa',
        timelineById: multiDataProviderMock,
      });

      expect(update).toEqual(
        set(
          'foo.dataProviders',
          [
            {
              and: [
                {
                  enabled: true,
                  id: 'executed-yioH7GoB9v5HJNSHKnp5-auditd_result-success',
                  name: 'success',
                  excluded: false,
                  kqlQuery: '',
                  queryMatch: {
                    field: 'auditd.result',
                    value: 'success',
                    operator: ':',
                  },
                },
              ],
              enabled: true,
              excluded: false,
              id: 'hosts-table-hostName-suricata-iowa',
              name: 'suricata-iowa',
              kqlQuery: '',
              queryMatch: {
                field: 'host.name',
                value: 'suricata-iowa',
                operator: ':',
              },
            },
          ],
          timelineByIdMock
        )
      );
    });

    test('should remove only the second AND provider when the second AND is deleted, and there are multiple andProviders', () => {
      const multiDataProvider: DataProvider[] = [
        {
          and: [
            {
              enabled: true,
              id: 'socket_closed-MSoH7GoB9v5HJNSHRYj1-user_name-root',
              name: 'root',
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'user.name',
                value: 'root',
                operator: ':',
              },
            },
            {
              enabled: true,
              id: 'executed-yioH7GoB9v5HJNSHKnp5-auditd_result-success',
              name: 'success',
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'auditd.result',
                value: 'success',
                operator: ':',
              },
            },
          ],
          enabled: true,
          excluded: false,
          id: 'hosts-table-hostName-suricata-iowa',
          name: 'suricata-iowa',
          kqlQuery: '',
          queryMatch: {
            field: 'host.name',
            value: 'suricata-iowa',
            operator: ':',
          },
        },
      ];

      const multiDataProviderMock = set('foo.dataProviders', multiDataProvider, timelineByIdMock);

      const update = removeTimelineProvider({
        andProviderId: 'executed-yioH7GoB9v5HJNSHKnp5-auditd_result-success',
        id: 'foo',
        providerId: 'hosts-table-hostName-suricata-iowa',
        timelineById: multiDataProviderMock,
      });

      expect(update).toEqual(
        set(
          'foo.dataProviders',
          [
            {
              and: [
                {
                  enabled: true,
                  id: 'socket_closed-MSoH7GoB9v5HJNSHRYj1-user_name-root',
                  name: 'root',
                  excluded: false,
                  kqlQuery: '',
                  queryMatch: {
                    field: 'user.name',
                    value: 'root',
                    operator: ':',
                  },
                },
              ],
              enabled: true,
              excluded: false,
              id: 'hosts-table-hostName-suricata-iowa',
              name: 'suricata-iowa',
              kqlQuery: '',
              queryMatch: {
                field: 'host.name',
                value: 'suricata-iowa',
                operator: ':',
              },
            },
          ],
          timelineByIdMock
        )
      );
    });
  });
});
