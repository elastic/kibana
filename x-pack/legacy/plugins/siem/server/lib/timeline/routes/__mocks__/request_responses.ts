/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIMELINE_EXPORT_URL, TIMELINE_IMPORT_URL } from '../../../../../common/constants';
import { requestMock } from '../../../detection_engine/routes/__mocks__';

export const getExportTimelinesRequest = () =>
  requestMock.create({
    method: 'get',
    path: TIMELINE_EXPORT_URL,
    body: {
      ids: ['f0e58720-57b6-11ea-b88d-3f1a31716be8', '890b8ae0-57df-11ea-a7c9-3976b7f1cb37'],
    },
  });

export const getImportTimelinesRequest = (filename?: string) =>
  requestMock.create({
    method: 'post',
    path: TIMELINE_IMPORT_URL,
    query: { overwrite: false },
    body: {
      file: { hapi: { filename: filename ?? 'filename.ndjson' } },
    },
  });

export const getImportTimelinesRequestEnableOverwrite = (filename?: string) =>
  requestMock.create({
    method: 'post',
    path: TIMELINE_IMPORT_URL,
    query: { overwrite: true },
    body: {
      file: { hapi: { filename: filename ?? 'filename.ndjson' } },
    },
  });

export const mockTimelinesSavedObjects = () => ({
  saved_objects: [
    {
      id: 'f0e58720-57b6-11ea-b88d-3f1a31716be8',
      type: 'fakeType',
      attributes: {},
      references: [],
    },
    {
      id: '890b8ae0-57df-11ea-a7c9-3976b7f1cb37',
      type: 'fakeType',
      attributes: {},
      references: [],
    },
  ],
});

export const mockTimelines = () => ({
  saved_objects: [
    {
      savedObjectId: 'f0e58720-57b6-11ea-b88d-3f1a31716be8',
      version: 'Wzk0OSwxXQ==',
      columns: [
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: '@timestamp',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'message',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'event.category',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'event.action',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'host.name',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'source.ip',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'destination.ip',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'user.name',
          searchable: null,
        },
      ],
      dataProviders: [],
      description: 'with a global note',
      eventType: 'raw',
      filters: [],
      kqlMode: 'filter',
      kqlQuery: {
        filterQuery: {
          kuery: { kind: 'kuery', expression: 'zeek.files.sha1 : * ' },
          serializedQuery:
            '{"bool":{"should":[{"exists":{"field":"zeek.files.sha1"}}],"minimum_should_match":1}}',
        },
      },
      title: 'test no.2',
      dateRange: { start: 1582538951145, end: 1582625351145 },
      savedQueryId: null,
      sort: { columnId: '@timestamp', sortDirection: 'desc' },
      created: 1582625382448,
      createdBy: 'elastic',
      updated: 1583741197521,
      updatedBy: 'elastic',
    },
    {
      savedObjectId: '890b8ae0-57df-11ea-a7c9-3976b7f1cb37',
      version: 'Wzk0NywxXQ==',
      columns: [
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: '@timestamp',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'message',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'event.category',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'event.action',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'host.name',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'source.ip',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'destination.ip',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'user.name',
          searchable: null,
        },
      ],
      dataProviders: [],
      description: 'with an event note',
      eventType: 'raw',
      filters: [],
      kqlMode: 'filter',
      kqlQuery: {
        filterQuery: {
          serializedQuery:
            '{"bool":{"should":[{"exists":{"field":"zeek.files.sha1"}}],"minimum_should_match":1}}',
          kuery: { expression: 'zeek.files.sha1 : * ', kind: 'kuery' },
        },
      },
      title: 'test no.3',
      dateRange: { start: 1582538951145, end: 1582625351145 },
      savedQueryId: null,
      sort: { columnId: '@timestamp', sortDirection: 'desc' },
      created: 1582642817439,
      createdBy: 'elastic',
      updated: 1583741175216,
      updatedBy: 'elastic',
    },
  ],
});

export const mockNotesSavedObjects = () => ({
  saved_objects: [
    {
      id: 'eb3f3930-61dc-11ea-8a49-e77254c5b742',
      type: 'fakeType',
      attributes: {},
      references: [],
    },
    {
      id: '706e7510-5d52-11ea-8f07-0392944939c1',
      type: 'fakeType',
      attributes: {},
      references: [],
    },
  ],
});

export const mockNotes = () => ({
  saved_objects: [
    {
      noteId: 'eb3f3930-61dc-11ea-8a49-e77254c5b742',
      version: 'Wzk1MCwxXQ==',
      note: 'Global note',
      timelineId: 'f0e58720-57b6-11ea-b88d-3f1a31716be8',
      created: 1583741205473,
      createdBy: 'elastic',
      updated: 1583741205473,
      updatedBy: 'elastic',
    },
    {
      noteId: '706e7510-5d52-11ea-8f07-0392944939c1',
      version: 'WzEwMiwxXQ==',
      eventId: '6HW_eHABMQha2n6bHvQ0',
      note: 'this is a note!!',
      timelineId: '890b8ae0-57df-11ea-a7c9-3976b7f1cb37',
      created: 1583241924223,
      createdBy: 'elastic',
      updated: 1583241924223,
      updatedBy: 'elastic',
    },
  ],
});

export const mockPinnedEvents = () => ({
  saved_objects: [],
});
