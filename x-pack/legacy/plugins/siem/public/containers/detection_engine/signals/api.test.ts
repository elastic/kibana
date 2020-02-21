/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../../lib/kibana';
import {
  signalsMock,
  mockSignalsQuery,
  mockStatusSignalQuery,
  mockSignalIndex,
  mockUserPrivilege,
} from './mock';
import {
  fetchQuerySignals,
  updateSignalStatus,
  getSignalIndex,
  getUserPrivilege,
  createSignalIndex,
} from './api';
import { ToasterErrors } from '../../../components/ml/api/throw_if_not_ok';
import { PostSignalError, SignalIndexError } from './types';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../lib/kibana');

const mockfetchSuccess = (body: unknown, fetchMock?: jest.Mock) => {
  if (fetchMock) {
    mockKibanaServices.mockImplementation(() => ({
      http: {
        fetch: fetchMock,
      },
    }));
  } else {
    mockKibanaServices.mockImplementation(() => ({
      http: {
        fetch: () => ({
          response: {
            ok: true,
            message: 'success',
            text: 'success',
          },
          body,
        }),
      },
    }));
  }
};

const mockfetchError = () => {
  mockKibanaServices.mockImplementation(() => ({
    http: {
      fetch: () => ({
        response: {
          ok: false,
          text: () =>
            JSON.stringify({
              message: 'super mega error, it is not that bad',
            }),
        },
        body: null,
      }),
    },
  }));
};

describe('Detections Signals API', () => {
  const fetchMock = jest.fn();

  describe('fetchQuerySignals', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: signalsMock,
      }));
    });
    test('check parameter url, body', async () => {
      mockfetchSuccess(null, fetchMock);

      await fetchQuerySignals({ query: mockSignalsQuery, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/signals/search', {
        asResponse: true,
        body:
          '{"aggs":{"signalsByGrouping":{"terms":{"field":"signal.rule.risk_score","missing":"All others","order":{"_count":"desc"},"size":10},"aggs":{"signals":{"date_histogram":{"field":"@timestamp","fixed_interval":"81000000ms","min_doc_count":0,"extended_bounds":{"min":1579644343954,"max":1582236343955}}}}}},"query":{"bool":{"filter":[{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}},{"range":{"@timestamp":{"gte":1579644343954,"lte":1582236343955}}}]}}}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });
    test('happy path', async () => {
      mockfetchSuccess(signalsMock);
      const signalsResp = await fetchQuerySignals({
        query: mockSignalsQuery,
        signal: abortCtrl.signal,
      });
      expect(signalsResp).toEqual(signalsMock);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await fetchQuerySignals({ query: mockSignalsQuery, signal: abortCtrl.signal });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('updateSignalStatus', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: {},
      }));
    });
    test('check parameter url, body when closing a signal', async () => {
      mockfetchSuccess(null, fetchMock);

      await updateSignalStatus({
        query: mockStatusSignalQuery,
        signal: abortCtrl.signal,
        status: 'closed',
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/signals/status', {
        asResponse: true,
        body:
          '{"status":"closed","bool":{"filter":{"terms":{"_id":["b4ee5c32e3a321057edcc953ca17228c6fdfe5ba43fdbbdaffa8cefa11605cc5"]}}}}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });
    test('check parameter url, body when opening a signal', async () => {
      mockfetchSuccess(null, fetchMock);

      await updateSignalStatus({
        query: mockStatusSignalQuery,
        signal: abortCtrl.signal,
        status: 'open',
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/signals/status', {
        asResponse: true,
        body:
          '{"status":"open","bool":{"filter":{"terms":{"_id":["b4ee5c32e3a321057edcc953ca17228c6fdfe5ba43fdbbdaffa8cefa11605cc5"]}}}}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });
    test('happy path', async () => {
      mockfetchSuccess({});
      const signalsResp = await updateSignalStatus({
        query: mockStatusSignalQuery,
        signal: abortCtrl.signal,
        status: 'open',
      });
      expect(signalsResp).toEqual({});
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await updateSignalStatus({
          query: mockStatusSignalQuery,
          signal: abortCtrl.signal,
          status: 'open',
        });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('getSignalIndex', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => mockSignalIndex);
    });
    test('check parameter url', async () => {
      mockfetchSuccess(null, fetchMock);

      await getSignalIndex({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/index', {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });
    test('happy path', async () => {
      mockfetchSuccess(null, fetchMock);
      const signalsResp = await getSignalIndex({
        signal: abortCtrl.signal,
      });
      expect(signalsResp).toEqual(mockSignalIndex);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await getSignalIndex({ signal: abortCtrl.signal });
      } catch (exp) {
        expect(exp).toBeInstanceOf(SignalIndexError);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('getUserPrivilege', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: mockUserPrivilege,
      }));
    });
    test('check parameter url', async () => {
      mockfetchSuccess(null, fetchMock);

      await getUserPrivilege({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/privileges', {
        asResponse: true,
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });
    test('happy path', async () => {
      mockfetchSuccess(mockUserPrivilege);
      const signalsResp = await getUserPrivilege({
        signal: abortCtrl.signal,
      });
      expect(signalsResp).toEqual(mockUserPrivilege);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await getUserPrivilege({ signal: abortCtrl.signal });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('createSignalIndex', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => mockSignalIndex);
    });
    test('check parameter url', async () => {
      mockfetchSuccess(null, fetchMock);

      await createSignalIndex({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/index', {
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });
    test('happy path', async () => {
      mockfetchSuccess(null, fetchMock);
      const signalsResp = await createSignalIndex({
        signal: abortCtrl.signal,
      });
      expect(signalsResp).toEqual(mockSignalIndex);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await createSignalIndex({ signal: abortCtrl.signal });
      } catch (exp) {
        expect(exp).toBeInstanceOf(PostSignalError);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });
});
