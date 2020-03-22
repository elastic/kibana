/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  mockTimelines,
  mockNotes,
  mockTimelinesSavedObjects,
  mockPinnedEvents,
  getImportTimelinesRequest,
} from './__mocks__/request_responses';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../detection_engine/routes/__mocks__';
import { TIMELINE_EXPORT_URL } from '../../../../common/constants';
import { convertSavedObjectToSavedNote } from '../../note/saved_object';
import { convertSavedObjectToSavedPinnedEvent } from '../../pinned_event/saved_object';
import { convertSavedObjectToSavedTimeline } from '../convert_saved_object_to_savedtimeline';
import {
  buildHapiStream,
  ruleIdsToNdJsonString,
} from '../../detection_engine/routes/__mocks__/utils';
import { getTupleDuplicateErrorsAndUniqueTimeline } from './utils';
import { createPromiseFromStreams } from '../../../../../../../../src/legacy/utils';
import { createTimelinesStreamFromNdJson } from '../create_timelines_stream_from_ndjson';

describe('import timelines', () => {
  let config;
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let securitySetup: SecuritySetup;
  let { clients, context } = requestContextMock.createTools();
  const mockDuplicateIdErrors = [];

  const mockParsedObjects = [
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
  const mockUniqueParsedObjects = [
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

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();

    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    config = jest.fn().mockImplementation(() => {
      return {
        get: () => {
          return 100000000;
        },
        has: jest.fn(),
      };
    });

    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue({
          user: {
            username: 'mockUser',
          },
        }),
      },
    };
    jest.doMock('./utils', () => {
      return {
        getTupleDuplicateErrorsAndUniqueTimeline: jest
          .fn()
          .mockReturnValue([mockDuplicateIdErrors, mockUniqueParsedObjects]),
      };
    });

    jest.doMock('../../../../../../../../src/legacy/utils', () => {
      return {
        createPromiseFromStreams: jest.fn().mockReturnValue(mockParsedObjects),
      };
    });

    jest.doMock('../create_timelines_stream_from_ndjson', () => {
      return {
        createTimelinesStreamFromNdJson: jest.fn().mockReturnValue([]),
      };
    });
  });

  describe('status codes', () => {
    test('returns 200 when import timeline successfully', async () => {
      jest.doMock('../saved_object', () => {
        return {
          Timeline: jest.fn().mockImplementation(() => {
            return {
              getTimeline: jest.fn().mockReturnValue(null),
              persistTimeline: jest.fn().mockReturnValue({
                timeline: { savedObjectId: '79deb4c0-6bc1-11ea-9999-f5341fb7a189' },
              }),
            };
          }),
        };
      });

      jest.doMock('../../pinned_event/saved_object', () => {
        return {
          PinnedEvent: jest.fn().mockImplementation(() => {
            return {
              persistPinnedEventOnTimeline: jest.fn(),
            };
          }),
        };
      });

      jest.doMock('../../note/saved_object', () => {
        return {
          Note: jest.fn().mockImplementation(() => {
            return {
              persistNote: jest.fn(),
            };
          }),
        };
      });

      const importTimelinesRoute = jest.requireActual('./import_timelines_route')
        .importTimelinesRoute;
      importTimelinesRoute(server.router, config, securitySetup);

      const response = await server.inject(getImportTimelinesRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('collect error when pin event throws error', async () => {
      jest.doMock('../saved_object', () => {
        return {
          Timeline: jest.fn().mockImplementation(() => {
            return {
              getTimeline: jest.fn().mockReturnValue(null),
              persistTimeline: jest.fn().mockReturnValue({
                timeline: { savedObjectId: '79deb4c0-6bc1-11ea-9999-f5341fb7a189' },
              }),
            };
          }),
        };
      });

      jest.doMock('../../pinned_event/saved_object', () => {
        return {
          PinnedEvent: jest.fn().mockImplementation(() => {
            return {
              persistPinnedEventOnTimeline: jest.fn().mockReturnValue(new Error('Test error')),
            };
          }),
        };
      });

      jest.doMock('../../note/saved_object', () => {
        return {
          Note: jest.fn().mockImplementation(() => {
            return {
              persistNote: jest.fn(),
            };
          }),
        };
      });

      const importTimelinesRoute = jest.requireActual('./import_timelines_route')
        .importTimelinesRoute;

      importTimelinesRoute(server.router, config, securitySetup);

      const response = await server.inject(getImportTimelinesRequest(), context, securitySetup);

      expect(response.body).toEqual({
        success: false,
        success_count: 0,
        errors: [
          {
            id: '79deb4c0-6bc1-11ea-9999-f5341fb7a189',
            error: { status_code: 500, message: 'Test error' },
          },
        ],
      });
    });
  });

  describe('request validation', () => {
    test('disallows invalid query', async () => {
      jest.doMock('../saved_object', () => {
        return {
          Timeline: jest.fn().mockImplementation(() => {
            return {
              getTimeline: jest.fn().mockReturnValue(null),
              persistTimeline: jest.fn().mockReturnValue({
                timeline: { savedObjectId: '79deb4c0-6bc1-11ea-9999-f5341fb7a189' },
              }),
            };
          }),
        };
      });

      jest.doMock('../../pinned_event/saved_object', () => {
        return {
          PinnedEvent: jest.fn().mockImplementation(() => {
            return {
              persistPinnedEventOnTimeline: jest.fn().mockReturnValue(new Error('Test error')),
            };
          }),
        };
      });

      jest.doMock('../../note/saved_object', () => {
        return {
          Note: jest.fn().mockImplementation(() => {
            return {
              persistNote: jest.fn(),
            };
          }),
        };
      });

      request = requestMock.create({
        method: 'post',
        path: TIMELINE_EXPORT_URL,
        body: { id: 'someId' },
      });
      const importTimelinesRoute = jest.requireActual('./import_timelines_route')
        .importTimelinesRoute;

      importTimelinesRoute(server.router, config, securitySetup);
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'child "file" fails because ["file" is required]'
      );
    });
  });
});
