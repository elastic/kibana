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
import { importTimelinesRoute } from './import_timelines_route';
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

describe('import timelines', () => {
  let config;
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    const hapiStream = buildHapiStream(ruleIdsToNdJsonString(['rule-1']));
    request = getImportTimelinesRequest(hapiStream);

    config = jest.fn().mockImplementation(() => {
      return {
        get: () => {
          return 100;
        },
        has: jest.fn(),
      };
    });
    const securitySetup: SecuritySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue({
          user: {
            username: 'mockUser',
          },
        }),
      },
    };

    importTimelinesRoute(server.router, config, securitySetup);
  });

  describe('status codes', () => {
    test('returns 200 when finding selected timelines', async () => {
      const response = await server.inject(getImportTimelinesRequest(), context);
      expect(response.status).toEqual(200);
    });

    test.skip('catch error when status search throws error', async () => {
      clients.savedObjectsClient.bulkGet.mockReset();
      clients.savedObjectsClient.bulkGet.mockRejectedValue(new Error('Test error'));

      const response = await server.inject(getImportTimelinesRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe.skip('request validation', () => {
    test('disallows singular id query param', async () => {
      const request = requestMock.create({
        method: 'get',
        path: TIMELINE_EXPORT_URL,
        body: { id: 'someId' },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith('"id" is not allowed');
    });
  });
});
