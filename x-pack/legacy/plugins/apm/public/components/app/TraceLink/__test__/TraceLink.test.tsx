/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { shallow } from 'enzyme';
import * as urlParamsHooks from '../../../../hooks/useUrlParams';
import * as hooks from '../../../../hooks/useFetcher';
import { TraceLink } from '../';

jest.mock('../../Main/route_config/index.tsx', () => ({
  routes: [
    {
      path: '/services/:serviceName/transactions/view',
      name: 'transaction_name'
    },
    {
      path: '/traces',
      name: 'traces'
    }
  ]
}));

describe('TraceLink', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('renders transition page', () => {
    const component = render(<TraceLink />);
    expect(component.getByText('Fetching trace...')).toBeDefined();
  });

  it('renders trace page when transaction is not found', () => {
    spyOn(urlParamsHooks, 'useUrlParams').and.returnValue({
      urlParams: {
        traceIdLink: '123',
        rangeFrom: 'now-24h',
        rangeTo: 'now'
      }
    });
    spyOn(hooks, 'useFetcher').and.returnValue({
      data: { transaction: undefined },
      status: 'success'
    });

    const component = shallow(<TraceLink />);
    expect(component.prop('to')).toEqual(
      '/traces?kuery=trace.id%2520%253A%2520%2522123%2522&rangeFrom=now-24h&rangeTo=now'
    );
  });

  describe('transaction page', () => {
    beforeAll(() => {
      spyOn(urlParamsHooks, 'useUrlParams').and.returnValue({
        urlParams: {
          traceIdLink: '123',
          rangeFrom: 'now-24h',
          rangeTo: 'now'
        }
      });
    });
    it('renders with date range params', () => {
      const transaction = {
        service: { name: 'foo' },
        transaction: {
          id: '456',
          name: 'bar',
          type: 'GET'
        },
        trace: { id: 123 }
      };
      spyOn(hooks, 'useFetcher').and.returnValue({
        data: { transaction },
        status: 'success'
      });
      const component = shallow(<TraceLink />);
      expect(component.prop('to')).toEqual(
        '/services/foo/transactions/view?traceId=123&transactionId=456&transactionName=bar&transactionType=GET&rangeFrom=now-24h&rangeTo=now'
      );
    });
  });
});
