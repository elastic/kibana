/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_DATA_REQUEST_ID } from '../../../common/constants';
import { DataRequest } from './data_request';

describe('DataRequest', () => {
  describe('getMeta', () => {
    test('should return the meta of an in-flight request when one is active', () => {
      const dataRequest = new DataRequest({
        dataId: SOURCE_DATA_REQUEST_ID,
        dataRequestMeta: { tileLayerId: 'loaded' },
        dataRequestMetaAtStart: { tileLayerId: 'inFlight' },
        dataRequestToken: Symbol('in-flight request'),
      });
      expect(dataRequest.getMeta()).toEqual({ tileLayerId: 'inFlight' });
    });

    test('should return the loaded meta when no request is in flight', () => {
      const dataRequest = new DataRequest({
        dataId: SOURCE_DATA_REQUEST_ID,
        dataRequestMeta: { tileLayerId: 'loaded' },
      });
      expect(dataRequest.getMeta()).toEqual({ tileLayerId: 'loaded' });
    });

    test('should return an empty object when the request has no meta', () => {
      const dataRequest = new DataRequest({ dataId: SOURCE_DATA_REQUEST_ID });
      expect(dataRequest.getMeta()).toEqual({});
    });
  });

  describe('getLoadedMeta', () => {
    test('should not be shadowed by the meta of an in-flight request', () => {
      const dataRequest = new DataRequest({
        dataId: SOURCE_DATA_REQUEST_ID,
        dataRequestMeta: { tileLayerId: 'loaded' },
        dataRequestMetaAtStart: { tileLayerId: 'inFlight' },
        dataRequestToken: Symbol('in-flight request'),
      });
      expect(dataRequest.getLoadedMeta()).toEqual({ tileLayerId: 'loaded' });
    });

    test('should return an empty object before the first request completes', () => {
      const dataRequest = new DataRequest({
        dataId: SOURCE_DATA_REQUEST_ID,
        dataRequestMetaAtStart: { tileLayerId: 'inFlight' },
        dataRequestToken: Symbol('in-flight request'),
      });
      expect(dataRequest.getLoadedMeta()).toEqual({});
    });
  });
});
