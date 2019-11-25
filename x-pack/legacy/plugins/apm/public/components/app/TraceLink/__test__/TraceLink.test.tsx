/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render } from 'react-testing-library';
import { shallow } from 'enzyme';
import * as urlParamsHooks from '../../../../hooks/useUrlParams';
import * as hooks from '../../../../hooks/useFetcher';
import { TraceLink } from '../';
import { mockNow } from '../../../../utils/testHelpers';
import moment from 'moment-timezone';

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
        traceIdLink: '123'
      }
    });
    spyOn(hooks, 'useFetcher').and.returnValue({
      data: { total: { value: 0 } }
    });

    const component = shallow(<TraceLink />);
    expect(component).toMatchSnapshot();
  });

  describe('transaction page', () => {
    beforeAll(() => {
      spyOn(urlParamsHooks, 'useUrlParams').and.returnValue({
        urlParams: {
          traceIdLink: '123'
        }
      });
      mockNow(moment('2019-11-25').valueOf());
    });
    it('renders with date range params', () => {
      const transaction = {
        service: { name: 'foo' },
        transaction: {
          id: '456',
          name: 'bar',
          type: 'GET'
        },
        timestamp: { us: moment('2019-11-23').valueOf() * 1000 }
      };
      spyOn(hooks, 'useFetcher').and.returnValue({
        data: { total: { value: 1 }, hits: [{ _source: transaction }] }
      });
      const component = shallow(<TraceLink />);
      expect(component).toMatchSnapshot();
    });

    it('renders without date range', () => {
      const transaction = {
        service: { name: 'foo' },
        transaction: {
          id: '456',
          name: 'bar',
          type: 'GET'
        },
        timestamp: { us: moment('2019-11-25').valueOf() * 1000 }
      };
      spyOn(hooks, 'useFetcher').and.returnValue({
        data: { total: { value: 1 }, hits: [{ _source: transaction }] }
      });
      const component = shallow(<TraceLink />);
      expect(component).toMatchSnapshot();
    });
  });
});
