/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as kfetchModule from 'ui/kfetch';
import { mockNow } from '../../utils/testHelpers';
import { _clearCache, callApi } from '../rest/callApi';
import { SessionStorageMock } from './SessionStorageMock';

jest.mock('ui/kfetch');

describe('callApi', () => {
  let kfetchSpy: jest.Mock;

  beforeEach(() => {
    kfetchSpy = jest.spyOn(kfetchModule, 'kfetch').mockResolvedValue({
      my_key: 'hello world'
    });
    // @ts-ignore
    global.sessionStorage = new SessionStorageMock();
  });

  afterEach(() => {
    kfetchSpy.mockClear();
    _clearCache();
  });

  describe('apm_debug', () => {
    beforeEach(() => {
      sessionStorage.setItem('apm_debug', 'true');
    });

    it('should add debug param for APM endpoints', async () => {
      await callApi({ pathname: `/api/apm/status/server` });

      expect(kfetchSpy).toHaveBeenCalledWith(
        { pathname: '/api/apm/status/server', query: { _debug: true } },
        undefined
      );
    });

    it('should not add debug param for non-APM endpoints', async () => {
      await callApi({ pathname: `/api/kibana` });

      expect(kfetchSpy).toHaveBeenCalledWith(
        { pathname: '/api/kibana' },
        undefined
      );
    });
  });

  describe('prependBasePath', () => {
    it('should be passed on to kFetch', async () => {
      await callApi({ pathname: `/api/kibana` }, { prependBasePath: false });

      expect(kfetchSpy).toHaveBeenCalledWith(
        { pathname: '/api/kibana' },
        { prependBasePath: false }
      );
    });
  });

  describe('cache', () => {
    let nowSpy: jest.Mock;
    beforeEach(() => {
      nowSpy = mockNow('2019');
    });

    beforeEach(() => {
      nowSpy.mockRestore();
    });

    describe('when the call does not contain start/end params', () => {
      it('should not return cached response for identical calls', async () => {
        await callApi({ pathname: `/api/kibana`, query: { foo: 'bar' } });
        await callApi({ pathname: `/api/kibana`, query: { foo: 'bar' } });
        await callApi({ pathname: `/api/kibana`, query: { foo: 'bar' } });

        expect(kfetchSpy).toHaveBeenCalledTimes(3);
      });
    });

    describe('when the call contains start/end params', () => {
      it('should return cached response for identical calls', async () => {
        await callApi({
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011' }
        });
        await callApi({
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011' }
        });
        await callApi({
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011' }
        });

        expect(kfetchSpy).toHaveBeenCalledTimes(1);
      });

      it('should not return cached response for subsequent calls if arguments change', async () => {
        await callApi({
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011', foo: 'bar1' }
        });
        await callApi({
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011', foo: 'bar2' }
        });
        await callApi({
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011', foo: 'bar3' }
        });

        expect(kfetchSpy).toHaveBeenCalledTimes(3);
      });

      it('should not return cached response if `end` is a future timestamp', async () => {
        await callApi({
          pathname: `/api/kibana`,
          query: { end: '2030' }
        });
        await callApi({
          pathname: `/api/kibana`,
          query: { end: '2030' }
        });
        await callApi({
          pathname: `/api/kibana`,
          query: { end: '2030' }
        });

        expect(kfetchSpy).toHaveBeenCalledTimes(3);
      });

      it('should return cached response if calls contain `end` param in the past', async () => {
        await callApi({
          pathname: `/api/kibana`,
          query: { start: '2009', end: '2010' }
        });
        await callApi({
          pathname: `/api/kibana`,
          query: { start: '2009', end: '2010' }
        });
        await callApi({
          pathname: `/api/kibana`,
          query: { start: '2009', end: '2010' }
        });

        expect(kfetchSpy).toHaveBeenCalledTimes(1);
      });

      it('should return cached response even if order of properties change', async () => {
        await callApi({
          pathname: `/api/kibana`,
          query: { end: '2010', start: '2009' }
        });
        await callApi({
          pathname: `/api/kibana`,
          query: { start: '2009', end: '2010' }
        });
        await callApi({
          query: { start: '2009', end: '2010' },
          pathname: `/api/kibana`
        });

        expect(kfetchSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
