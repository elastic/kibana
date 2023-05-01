/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '../common/types';
import { defaultHeaders } from './header';

// FIXME add strong typings
export const mockGlobalState = {
  app: {
    notesById: {},
    errors: [
      { id: 'error-id-1', title: 'title-1', message: ['error-message-1'] },
      { id: 'error-id-2', title: 'title-2', message: ['error-message-2'] },
    ],
  },
  dataTable: {
    tableById: {
      [TableId.test]: {
        columns: defaultHeaders,
        defaultColumns: defaultHeaders,
        dataViewId: 'security-solution-default',
        deletedEventIds: [],
        expandedDetail: {},
        filters: [],
        indexNames: ['.alerts-security.alerts-default'],
        isSelectAllChecked: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        loadingEventIds: [],
        selectedEventIds: {},
        showCheckboxes: false,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'date',
            esTypes: ['date'],
            sortDirection: 'desc',
          },
        ],
        graphEventId: '',
        sessionViewConfig: null,
        selectAll: false,
        id: TableId.test,
        title: '',
        initialized: true,
        updated: 1663882629000,
        isLoading: false,
        queryFields: [],
        totalCount: 0,
      },
    },
  },
};
