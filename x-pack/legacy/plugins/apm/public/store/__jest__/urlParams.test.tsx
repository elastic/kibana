/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { mockNow } from '../../utils/testHelpers';
import { updateLocation } from '../location';
import { APMAction, refreshTimeRange, urlParamsReducer } from '../urlParams';

describe('urlParams', () => {
  beforeEach(() => {
    mockNow('2010');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should parse "last 15 minutes"', () => {
    const action = updateLocation({
      pathname: '',
      search: '?rangeFrom=now-15m&rangeTo=now'
    } as Location) as APMAction;
    const { start, end } = urlParamsReducer({}, action);

    expect({ start, end }).toEqual({
      start: '2009-12-31T23:45:00.000Z',
      end: '2010-01-01T00:00:00.000Z'
    });
  });

  it('should parse "last 7 days"', () => {
    const action = updateLocation({
      pathname: '',
      search: '?rangeFrom=now-7d&rangeTo=now'
    } as Location) as APMAction;
    const { start, end } = urlParamsReducer({}, action);

    expect({ start, end }).toEqual({
      start: '2009-12-25T00:00:00.000Z',
      end: '2010-01-01T00:00:00.000Z'
    });
  });

  it('should parse absolute dates', () => {
    const action = updateLocation({
      pathname: '',
      search:
        '?rangeFrom=2019-02-03T10:00:00.000Z&rangeTo=2019-02-10T16:30:00.000Z'
    } as Location) as APMAction;
    const { start, end } = urlParamsReducer({}, action);

    expect({ start, end }).toEqual({
      start: '2019-02-03T10:00:00.000Z',
      end: '2019-02-10T16:30:00.000Z'
    });
  });

  it('should handle LOCATION_UPDATE for transactions section', () => {
    const action = updateLocation({
      pathname:
        'myServiceName/transactions/myTransactionType/myTransactionName/b/c',
      search: '?transactionId=myTransactionId&detailTab=request&spanId=10'
    } as Location) as APMAction;
    const state = urlParamsReducer({}, action);

    expect(state).toEqual({
      detailTab: 'request',
      end: '2010-01-01T00:00:00.000Z',
      page: 0,
      processorEvent: 'transaction',
      rangeFrom: 'now-24h',
      rangeTo: 'now',
      refreshInterval: 0,
      refreshPaused: true,
      serviceName: 'myServiceName',
      spanId: 10,
      start: '2009-12-31T00:00:00.000Z',
      transactionId: 'myTransactionId',
      transactionName: 'myTransactionName',
      transactionType: 'myTransactionType'
    });
  });

  it('should handle LOCATION_UPDATE for error section', () => {
    const action = updateLocation({
      pathname: 'myServiceName/errors/myErrorGroupId',
      search: '?detailTab=request&transactionId=myTransactionId'
    } as Location) as APMAction;
    const state = urlParamsReducer({}, action);

    expect(state).toEqual(
      expect.objectContaining({
        serviceName: 'myServiceName',
        errorGroupId: 'myErrorGroupId',
        detailTab: 'request',
        transactionId: 'myTransactionId'
      })
    );
  });

  it('should handle refreshTimeRange action', () => {
    const action = refreshTimeRange({ rangeFrom: 'now', rangeTo: 'now-15m' });
    const state = urlParamsReducer({}, action);

    expect(state).toEqual({
      start: '2010-01-01T00:00:00.000Z',
      end: '2009-12-31T23:45:00.000Z'
    });
  });
});
