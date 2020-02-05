/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from '../__mocks__/_mock_server';
import { setSignalsStatusRoute } from './open_close_signals_route';
import * as myUtils from '../utils';
import { ServerInjectOptions } from 'hapi';

import {
  getSetSignalStatusByIdsRequest,
  getSetSignalStatusByQueryRequest,
  typicalSetStatusSignalByIdsPayload,
  typicalSetStatusSignalByQueryPayload,
  setStatusSignalMissingIdsAndQueryPayload,
} from '../__mocks__/request_responses';
import { DETECTION_ENGINE_SIGNALS_STATUS_URL } from '../../../../../common/constants';

describe('set signal status', () => {
  let { inject, services, callClusterMock } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(myUtils, 'getIndex').mockReturnValue('fakeindex');
    ({ inject, services, callClusterMock } = createMockServer());
    callClusterMock.mockImplementation(() => true);
    setSignalsStatusRoute(services);
  });

  describe('status on signal', () => {
    test('returns 200 when setting a status on a signal by ids', async () => {
      const { statusCode } = await inject(getSetSignalStatusByIdsRequest());
      expect(statusCode).toBe(200);
      expect(myUtils.getIndex).toHaveReturnedWith('fakeindex');
    });

    test('returns 200 when setting a status on a signal by query', async () => {
      const { statusCode } = await inject(getSetSignalStatusByQueryRequest());
      expect(statusCode).toBe(200);
    });
  });

  describe('validation', () => {
    test('returns 200 if signal_ids and status are present', async () => {
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        payload: typicalSetStatusSignalByIdsPayload(),
      };
      const { statusCode } = await inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 200 if query and status are present', async () => {
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        payload: typicalSetStatusSignalByQueryPayload(),
      };
      const { statusCode } = await inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if signal_ids and query are not present', async () => {
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        payload: setStatusSignalMissingIdsAndQueryPayload(),
      };
      const { statusCode } = await inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns 400 if signal_ids are present but status is not', async () => {
      const { status, ...justIds } = typicalSetStatusSignalByIdsPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        payload: justIds,
      };
      const { statusCode } = await inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns 400 if query is present but status is not', async () => {
      const { status, ...justTheQuery } = typicalSetStatusSignalByQueryPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        payload: justTheQuery,
      };
      const { statusCode } = await inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns 400 if query and signal_ids are present but status is not', async () => {
      const allTogether = {
        ...typicalSetStatusSignalByIdsPayload(),
        ...typicalSetStatusSignalByQueryPayload(),
      };
      const { status, ...queryAndSignalIdsNoStatus } = allTogether;
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        payload: queryAndSignalIdsNoStatus,
      };
      const { statusCode } = await inject(request);
      expect(statusCode).toBe(400);
    });
  });
});
