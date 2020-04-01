/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { deserializeAutoFollowPattern } from '../../../../../common/services/auto_follow_pattern_serialization';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { getAutoFollowPatternMock, getAutoFollowPatternListMock } from '../../../../../fixtures';
import { registerAutoFollowPatternRoutes } from '../auto_follow_pattern';

import { createRouter, callRoute } from './helpers';

jest.mock('../../../lib/call_with_request_factory');
jest.mock('../../../lib/is_es_error_factory');
jest.mock('../../../lib/license_pre_routing_factory', () => ({
  licensePreRoutingFactory: ({ requestHandler }) => requestHandler,
}));

const DESERIALIZED_KEYS = Object.keys(deserializeAutoFollowPattern(getAutoFollowPatternMock()));

let routeRegistry;

/**
 * Helper to extract all the different server route handler so we can easily call them in our tests.
 *
 * Important: This method registers the handlers in the order that they appear in the file, so
 * if a "server.route()" call is moved or deleted, then the HANDLER_INDEX_TO_ACTION must be updated here.
 */
const registerHandlers = () => {
  const HANDLER_INDEX_TO_ACTION = {
    0: 'list',
    1: 'create',
    2: 'update',
    3: 'get',
    4: 'delete',
    5: 'pause',
    6: 'resume',
  };

  routeRegistry = createRouter(HANDLER_INDEX_TO_ACTION);

  registerAutoFollowPatternRoutes({
    __LEGACY: {},
    router: routeRegistry.router,
  });
};

/**
 * Queue to save request response and errors
 * It allows us to fake multiple responses from the
 * callWithRequestFactory() when the request handler call it
 * multiple times.
 */
let requestResponseQueue = [];

/**
 * Helper to mock the response from the call to Elasticsearch
 *
 * @param {*} err The mock error to throw
 * @param {*} response The response to return
 */
const setHttpRequestResponse = (error, response) => {
  requestResponseQueue.push({ error, response });
};

const resetHttpRequestResponses = () => (requestResponseQueue = []);

const getNextResponseFromQueue = () => {
  if (!requestResponseQueue.length) {
    return null;
  }

  const next = requestResponseQueue.shift();
  if (next.error) {
    return Promise.reject(next.error);
  }
  return Promise.resolve(next.response);
};

describe('[CCR API Routes] Auto Follow Pattern', () => {
  let routeHandler;

  beforeAll(() => {
    isEsErrorFactory.mockReturnValue(() => false);
    callWithRequestFactory.mockReturnValue(getNextResponseFromQueue);
    registerHandlers();
  });

  describe('list()', () => {
    beforeEach(() => {
      routeHandler = routeRegistry.getRoutes().list;
    });

    it('should deserialize the response from Elasticsearch', async () => {
      const totalResult = 2;
      setHttpRequestResponse(null, getAutoFollowPatternListMock(totalResult));

      const {
        options: { body: response },
      } = await callRoute(routeHandler);
      const autoFollowPattern = response.patterns[0];

      expect(response.patterns.length).toEqual(totalResult);
      expect(Object.keys(autoFollowPattern)).toEqual(DESERIALIZED_KEYS);
    });
  });

  describe('create()', () => {
    beforeEach(() => {
      resetHttpRequestResponses();
      routeHandler = routeRegistry.getRoutes().create;
    });

    it('should throw a 409 conflict error if id already exists', async () => {
      setHttpRequestResponse(null, { acknowledge: true });
      setHttpRequestResponse(null, { acknowledge: true });

      const response = await callRoute(
        routeHandler,
        {},
        {
          body: {
            id: 'some-id',
            foo: 'bar',
          },
        }
      );

      expect(response.status).toEqual(409);
    });

    it('should return 200 status when the id does not exist', async () => {
      const error = new Error('Resource not found.');
      error.statusCode = 404;
      setHttpRequestResponse(error);
      setHttpRequestResponse(null, { acknowledge: true });

      const {
        options: { body: response },
      } = await callRoute(
        routeHandler,
        {},
        {
          body: {
            id: 'some-id',
            foo: 'bar',
          },
        }
      );

      expect(response).toEqual({ acknowledge: true });
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      routeHandler = routeRegistry.getRoutes().update;
    });

    it('should serialize the payload before sending it to Elasticsearch', async () => {
      callWithRequestFactory.mockReturnValueOnce((_, payload) => payload);

      const request = {
        params: { id: 'foo' },
        body: {
          remoteCluster: 'bar1',
          leaderIndexPatterns: ['bar2'],
          followIndexPattern: 'bar3',
        },
      };

      const response = await callRoute(routeHandler, {}, request);

      expect(response.options.body).toEqual({
        id: 'foo',
        body: {
          remote_cluster: 'bar1',
          leader_index_patterns: ['bar2'],
          follow_index_pattern: 'bar3',
        },
      });
    });
  });

  describe('get()', () => {
    beforeEach(() => {
      routeHandler = routeRegistry.getRoutes().get;
    });

    it('should return a single resource even though ES return an array with 1 item', async () => {
      const autoFollowPattern = getAutoFollowPatternMock();
      const esResponse = { patterns: [autoFollowPattern] };

      setHttpRequestResponse(null, esResponse);

      const response = await callRoute(routeHandler, {}, { params: { id: 1 } });
      expect(Object.keys(response.options.body)).toEqual(DESERIALIZED_KEYS);
    });
  });

  describe('delete()', () => {
    beforeEach(() => {
      resetHttpRequestResponses();
      routeHandler = routeRegistry.getRoutes().delete;
    });

    it('should delete a single item', async () => {
      setHttpRequestResponse(null, { acknowledge: true });

      const {
        options: { body: response },
      } = await callRoute(routeHandler, {}, { params: { id: 'a' } });

      expect(response.itemsDeleted).toEqual(['a']);
      expect(response.errors).toEqual([]);
    });

    it('should accept a list of ids to delete', async () => {
      setHttpRequestResponse(null, { acknowledge: true });
      setHttpRequestResponse(null, { acknowledge: true });
      setHttpRequestResponse(null, { acknowledge: true });

      const response = await callRoute(routeHandler, {}, { params: { id: 'a,b,c' } });

      expect(response.options.body.itemsDeleted).toEqual(['a', 'b', 'c']);
    });

    it('should catch error and return them in array', async () => {
      const error = new Error('something went wrong');
      error.response = '{ "error": {} }';

      setHttpRequestResponse(null, { acknowledge: true });
      setHttpRequestResponse(error);

      const {
        options: { body: response },
      } = await callRoute(routeHandler, {}, { params: { id: 'a,b' } });

      expect(response.itemsDeleted).toEqual(['a']);
      expect(response.errors[0].id).toEqual('b');
    });
  });

  describe('pause()', () => {
    beforeEach(() => {
      resetHttpRequestResponses();
      routeHandler = routeRegistry.getRoutes().pause;
    });

    it('accept a single item', async () => {
      setHttpRequestResponse(null, { acknowledge: true });

      const {
        options: { body: response },
      } = await callRoute(routeHandler, {}, { params: { id: 'a' } });

      expect(response.itemsPaused).toEqual(['a']);
      expect(response.errors).toEqual([]);
    });

    it('should accept a list of items to pause', async () => {
      setHttpRequestResponse(null, { acknowledge: true });
      setHttpRequestResponse(null, { acknowledge: true });
      setHttpRequestResponse(null, { acknowledge: true });

      const response = await callRoute(routeHandler, {}, { params: { id: 'a,b,c' } });

      expect(response.options.body.itemsPaused).toEqual(['a', 'b', 'c']);
    });

    it('should catch error and return them in array', async () => {
      const error = new Error('something went wrong');
      error.response = '{ "error": {} }';

      setHttpRequestResponse(null, { acknowledge: true });
      setHttpRequestResponse(error);

      const {
        options: { body: response },
      } = await callRoute(routeHandler, {}, { params: { id: 'a,b' } });

      expect(response.itemsPaused).toEqual(['a']);
      expect(response.errors[0].id).toEqual('b');
    });
  });

  describe('resume()', () => {
    beforeEach(() => {
      resetHttpRequestResponses();
      routeHandler = routeRegistry.getRoutes().resume;
    });

    it('accept a single item', async () => {
      setHttpRequestResponse(null, { acknowledge: true });

      const {
        options: { body: response },
      } = await callRoute(routeHandler, {}, { params: { id: 'a' } });

      expect(response.itemsResumed).toEqual(['a']);
      expect(response.errors).toEqual([]);
    });

    it('should accept a list of items to pause', async () => {
      setHttpRequestResponse(null, { acknowledge: true });
      setHttpRequestResponse(null, { acknowledge: true });
      setHttpRequestResponse(null, { acknowledge: true });

      const response = await callRoute(routeHandler, {}, { params: { id: 'a,b,c' } });

      expect(response.options.body.itemsResumed).toEqual(['a', 'b', 'c']);
    });

    it('should catch error and return them in array', async () => {
      const error = new Error('something went wrong');
      error.response = '{ "error": {} }';

      setHttpRequestResponse(null, { acknowledge: true });
      setHttpRequestResponse(error);

      const {
        options: { body: response },
      } = await callRoute(routeHandler, {}, { params: { id: 'a,b' } });

      expect(response.itemsResumed).toEqual(['a']);
      expect(response.errors[0].id).toEqual('b');
    });
  });
});
