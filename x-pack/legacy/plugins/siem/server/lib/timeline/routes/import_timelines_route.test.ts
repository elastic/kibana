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
  getImportTimelinesRequestEnableOverwrite,
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
import {
  mockConfig,
  mockUniqueParsedObjects,
  mockParsedObjects,
  mockDuplicateIdErrors,
  mockGetCurrentUser,
} from './__mocks__/import_timelines';

describe('import timelines', () => {
  let config;
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let securitySetup: SecuritySetup;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();

    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    config = jest.fn().mockImplementation(() => {
      return mockConfig;
    });

    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
    };

    jest.doMock('../create_timelines_stream_from_ndjson', () => {
      return {
        createTimelinesStreamFromNdJson: jest.fn().mockReturnValue(mockParsedObjects),
      };
    });

    jest.doMock('../../../../../../../../src/legacy/utils', () => {
      return {
        createPromiseFromStreams: jest.fn().mockReturnValue(mockParsedObjects),
      };
    });

    jest.doMock('./utils', () => {
      return {
        getTupleDuplicateErrorsAndUniqueTimeline: jest
          .fn()
          .mockReturnValue([mockDuplicateIdErrors, mockUniqueParsedObjects]),
      };
    });
  });

  describe('Import a new timeline', () => {
    beforeEach(() => {
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
    });
    test('returns 200 when import timeline successfully', async () => {
      const response = await server.inject(getImportTimelinesRequest(), context);
      expect(response.status).toEqual(200);
    });
  });

  describe('Import a timeline already exist but overwrite is not allowed', () => {
    beforeEach(() => {
      jest.doMock('../saved_object', () => {
        return {
          Timeline: jest.fn().mockImplementation(() => {
            return {
              getTimeline: jest.fn().mockReturnValue(mockParsedObjects),
              persistTimeline: jest.fn(),
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
    });
    test('returns error message', async () => {
      const response = await server.inject(getImportTimelinesRequest(), context);
      expect(response.body).toEqual({
        success: false,
        success_count: 0,
        errors: [
          {
            id: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
            error: {
              status_code: 409,
              message: `timeline_id: "79deb4c0-6bc1-11ea-a90b-f5341fb7a189" already exists`,
            },
          },
        ],
      });
    });
  });

  describe('Import an existing timeline and allow overwrite', () => {
    beforeEach(() => {
      jest.doMock('../saved_object', () => {
        return {
          Timeline: jest.fn().mockImplementation(() => {
            return {
              getTimeline: jest.fn().mockReturnValue(mockParsedObjects),
              persistTimeline: jest.fn(),
            };
          }),
        };
      });

      jest.doMock('../../pinned_event/saved_object', () => {
        return {
          PinnedEvent: jest.fn().mockImplementation(() => {
            return {
              persistPinnedEventOnTimeline: jest.fn(),
              getAllPinnedEventsByTimelineId: jest.fn().mockReturnValue(['k-gi8nABm-sIqJ_scOoS']),
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
    });
    test('returns status 200 ', async () => {
      const response = await server.inject(getImportTimelinesRequestEnableOverwrite(), context);
      expect(response.body).toEqual({
        success: true,
        success_count: 1,
        errors: [],
      });
    });
  });

  describe('Import a new timeline but failed when pinning events', () => {
    beforeEach(() => {
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
    });
    test('collect error and finish the process', async () => {
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
    beforeEach(() => {
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
    });
    test('disallows invalid query', async () => {
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
