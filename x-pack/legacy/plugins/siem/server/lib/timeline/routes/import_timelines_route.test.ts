/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getImportTimelinesRequest,
  getImportTimelinesRequestEnableOverwrite,
} from './__mocks__/request_responses';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../detection_engine/routes/__mocks__';
import { TIMELINE_EXPORT_URL } from '../../../../common/constants';
import { SecurityPluginSetup } from '../../../../../../../plugins/security/server';

import {
  mockConfig,
  mockUniqueParsedObjects,
  mockParsedObjects,
  mockDuplicateIdErrors,
  mockGetCurrentUser,
  mockGetTimelineValue,
} from './__mocks__/import_timelines';

describe('import timelines', () => {
  let config: jest.Mock;
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { context } = requestContextMock.createTools();
  let mockGetTimeline: jest.Mock;
  let mockPersistTimeline: jest.Mock;
  let mockPersistPinnedEventOnTimeline: jest.Mock;
  let mockPersistNote: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();

    server = serverMock.create();
    context = requestContextMock.createTools().context;
    config = jest.fn().mockImplementation(() => {
      return mockConfig;
    });

    securitySetup = ({
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown) as SecurityPluginSetup;

    mockGetTimeline = jest.fn();
    mockPersistTimeline = jest.fn();
    mockPersistPinnedEventOnTimeline = jest.fn();
    mockPersistNote = jest.fn();

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

    jest.doMock('./utils/import_timelines', () => {
      const originalModule = jest.requireActual('./utils/import_timelines');
      return {
        ...originalModule,
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
              getTimeline: mockGetTimeline.mockReturnValue(null),
              persistTimeline: mockPersistTimeline.mockReturnValue({
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
              persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline,
            };
          }),
        };
      });

      jest.doMock('../../note/saved_object', () => {
        return {
          Note: jest.fn().mockImplementation(() => {
            return {
              persistNote: mockPersistNote,
            };
          }),
        };
      });

      const importTimelinesRoute = jest.requireActual('./import_timelines_route')
        .importTimelinesRoute;
      importTimelinesRoute(server.router, config, securitySetup);
    });

    test('should see if the given timeline savedObjectId already exist', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockGetTimeline).toHaveBeenCalled();
    });

    test('should Create a new timeline savedObject', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline).toHaveBeenCalled();
    });

    test('should Create new pinned events', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistPinnedEventOnTimeline).toHaveBeenCalled();
    });

    test('should Create notes', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote).toHaveBeenCalled();
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
              getTimeline: mockGetTimeline.mockReturnValue(mockGetTimelineValue),
              persistTimeline: mockPersistTimeline,
            };
          }),
        };
      });

      jest.doMock('../../pinned_event/saved_object', () => {
        return {
          PinnedEvent: jest.fn().mockImplementation(() => {
            return {
              persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline,
            };
          }),
        };
      });

      jest.doMock('../../note/saved_object', () => {
        return {
          Note: jest.fn().mockImplementation(() => {
            return {
              persistNote: mockPersistNote,
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
              getTimeline: mockGetTimeline.mockReturnValue(mockGetTimelineValue),
              persistTimeline: mockPersistTimeline,
            };
          }),
        };
      });

      jest.doMock('../../pinned_event/saved_object', () => {
        return {
          PinnedEvent: jest.fn().mockImplementation(() => {
            return {
              persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline,
            };
          }),
        };
      });

      jest.doMock('../../note/saved_object', () => {
        return {
          Note: jest.fn().mockImplementation(() => {
            return {
              persistNote: mockPersistNote,
            };
          }),
        };
      });

      const importTimelinesRoute = jest.requireActual('./import_timelines_route')
        .importTimelinesRoute;
      importTimelinesRoute(server.router, config, securitySetup);
    });

    test('should see if the given timeline savedObjectId already exist', async () => {
      const mockRequest = getImportTimelinesRequestEnableOverwrite();
      await server.inject(mockRequest, context);
      expect(mockGetTimeline).toHaveBeenCalled();
    });

    test('should Update existing timeline savedObject', async () => {
      const mockRequest = getImportTimelinesRequestEnableOverwrite();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline).toHaveBeenCalled();
    });

    test('should Create new pinned events', async () => {
      const mockRequest = getImportTimelinesRequestEnableOverwrite();
      await server.inject(mockRequest, context);
      expect(mockPersistPinnedEventOnTimeline).toHaveBeenCalled();
    });

    test('should Create/Update notes', async () => {
      const mockRequest = getImportTimelinesRequestEnableOverwrite();
      await server.inject(mockRequest, context);
      expect(mockPersistNote).toHaveBeenCalled();
    });

    test('returns status 200 ', async () => {
      const mockRequest = getImportTimelinesRequestEnableOverwrite();
      const response = await server.inject(mockRequest, context);
      expect(response.body).toEqual({
        success: true,
        success_count: 1,
        errors: [],
      });
    });
  });

  describe('request validation', () => {
    beforeEach(() => {
      jest.doMock('../saved_object', () => {
        return {
          Timeline: jest.fn().mockImplementation(() => {
            return {
              getTimeline: mockGetTimeline.mockReturnValue(null),
              persistTimeline: mockPersistTimeline.mockReturnValue({
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
              persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline.mockReturnValue(
                new Error('Test error')
              ),
            };
          }),
        };
      });

      jest.doMock('../../note/saved_object', () => {
        return {
          Note: jest.fn().mockImplementation(() => {
            return {
              persistNote: mockPersistNote,
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
