/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockDuplicateIdErrors = [];

export const mockParsedObjects = [
  {
    savedObjectId: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
    version: 'WzEyMjUsMV0=',
    columns: [],
    dataProviders: [],
    description: 'description',
    eventType: 'all',
    filters: [],
    kqlMode: 'filter',
    kqlQuery: { filterQuery: [Object] },
    title: 'My duplicate timeline',
    dateRange: { start: 1584523907294, end: 1584610307294 },
    savedQueryId: null,
    sort: { columnId: '@timestamp', sortDirection: 'desc' },
    created: 1584828930463,
    createdBy: 'angela',
    updated: 1584868346013,
    updatedBy: 'angela',
    eventNotes: [],
    globalNotes: [],
    pinnedEventIds: ['k-gi8nABm-sIqJ_scOoS'],
  },
];

export const mockUniqueParsedObjects = [
  {
    savedObjectId: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
    version: 'WzEyMjUsMV0=',
    columns: [],
    dataProviders: [],
    description: 'description',
    eventType: 'all',
    filters: [],
    kqlMode: 'filter',
    kqlQuery: { filterQuery: [Object] },
    title: 'My duplicate timeline',
    dateRange: { start: 1584523907294, end: 1584610307294 },
    savedQueryId: null,
    sort: { columnId: '@timestamp', sortDirection: 'desc' },
    created: 1584828930463,
    createdBy: 'angela',
    updated: 1584868346013,
    updatedBy: 'angela',
    eventNotes: [],
    globalNotes: [],
    pinnedEventIds: ['k-gi8nABm-sIqJ_scOoS'],
  },
];

export const mockConfig = {
  get: () => {
    return 100000000;
  },
  has: jest.fn(),
};

export const mockGetCurrentUser = {
  user: {
    username: 'mockUser',
  },
};
