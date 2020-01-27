/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockNow } from '../../utils/testHelpers';
import { clearCache, callApi } from '../rest/callApi';
import { SessionStorageMock } from './SessionStorageMock';
import { HttpSetup } from 'kibana/public';

type HttpMock = HttpSetup & {
  get: jest.SpyInstance<HttpSetup['get']>;
};

describe('callApi', () => {
  let http: HttpMock;

  beforeEach(() => {
    http = ({
      get: jest.fn().mockReturnValue({
        my_key: 'hello_world'
      })
    } as unknown) as HttpMock;

    // @ts-ignore
    global.sessionStorage = new SessionStorageMock();
  });

  afterEach(() => {
    http.get.mockClear();
    clearCache();
  });

  describe('apm_debug', () => {
    beforeEach(() => {
      sessionStorage.setItem('apm_debug', 'true');
    });

    it('should add debug param for APM endpoints', async () => {
      await callApi(http, { pathname: `/api/apm/status/server` });

      expect(http.get).toHaveBeenCalledWith('/api/apm/status/server', {
        query: { _debug: true }
      });
    });

    it('should not add debug param for non-APM endpoints', async () => {
      await callApi(http, { pathname: `/api/kibana` });

      expect(http.get).toHaveBeenCalledWith('/api/kibana', { query: {} });
    });
  });

  describe('cache', () => {
    let nowSpy: jest.SpyInstance;
    beforeEach(() => {
      nowSpy = mockNow('2019');
    });

    beforeEach(() => {
      nowSpy.mockRestore();
    });

    describe('when the call does not contain start/end params', () => {
      it('should not return cached response for identical calls', async () => {
        await callApi(http, { pathname: `/api/kibana`, query: { foo: 'bar' } });
        await callApi(http, { pathname: `/api/kibana`, query: { foo: 'bar' } });
        await callApi(http, { pathname: `/api/kibana`, query: { foo: 'bar' } });

        expect(http.get).toHaveBeenCalledTimes(3);
      });
    });

    describe('when the call contains start/end params', () => {
      it('should return cached response for identical calls', async () => {
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011' }
        });
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011' }
        });
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011' }
        });

        expect(http.get).toHaveBeenCalledTimes(1);
      });

      it('should not return cached response for subsequent calls if arguments change', async () => {
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011', foo: 'bar1' }
        });
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011', foo: 'bar2' }
        });
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011', foo: 'bar3' }
        });

        expect(http.get).toHaveBeenCalledTimes(3);
      });

      it('should not return cached response if `end` is a future timestamp', async () => {
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { end: '2030' }
        });
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { end: '2030' }
        });
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { end: '2030' }
        });

        expect(http.get).toHaveBeenCalledTimes(3);
      });

      it('should return cached response if calls contain `end` param in the past', async () => {
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { start: '2009', end: '2010' }
        });
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { start: '2009', end: '2010' }
        });
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { start: '2009', end: '2010' }
        });

        expect(http.get).toHaveBeenCalledTimes(1);
      });

      it('should return cached response even if order of properties change', async () => {
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { end: '2010', start: '2009' }
        });
        await callApi(http, {
          pathname: `/api/kibana`,
          query: { start: '2009', end: '2010' }
        });
        await callApi(http, {
          query: { start: '2009', end: '2010' },
          pathname: `/api/kibana`
        });

        expect(http.get).toHaveBeenCalledTimes(1);
      });
    });
  });
});
