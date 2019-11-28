/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl } from 'test_utils/enzyme_helpers';
import DateMath from '@elastic/datemath';
import React, { useState, Fragment } from 'react';
import { useUrlParams, UptimeUrlParamsHook } from '../use_url_params';
import { RouteComponentProps } from 'react-router-dom';
import { UptimeRefreshContext } from '../../contexts';

interface MockUrlParamsComponentProps {
  hook: UptimeUrlParamsHook;
  updateParams?: { [key: string]: any };
}

let mockRouter: RouteComponentProps;

const UseUrlParamsTestComponent = ({ hook, updateParams }: MockUrlParamsComponentProps) => {
  const [params, setParams] = useState({});
  const [getUrlParams, updateUrlParams] = hook();
  return (
    <Fragment>
      {Object.keys(params).length > 0 ? <div>{JSON.stringify(params)}</div> : null}
      <button
        id="setUrlParams"
        onClick={() => {
          updateUrlParams(updateParams || { dateRangeStart: 'now-12d', dateRangeEnd: 'now' });
        }}
      >
        Set url params
      </button>
      <button id="getUrlParams" onClick={() => setParams(getUrlParams())}>
        Get url params
      </button>
    </Fragment>
  );
};

describe('useUrlParams', () => {
  let dateMathSpy: any;
  const MOCK_DATE_VALUE = 20;
  beforeEach(() => {
    mockRouter = {
      // @ts-ignore other properties aren't needed for this test
      history: {
        push: jest.fn(),
      },
      location: {
        pathname: '',
        search: '?g=""',
        state: {},
        hash: '',
      },
      match: {
        params: '',
        isExact: true,
        path: '/',
        url: 'http://elastic.co',
      },
    };
    dateMathSpy = jest.spyOn(DateMath, 'parse');
    dateMathSpy.mockReturnValue(MOCK_DATE_VALUE);
  });

  it('accepts router props, updates URL params, and returns the current params', () => {
    const component = mountWithIntl(
      <UptimeRefreshContext.Provider
        value={{ lastRefresh: 123, history: mockRouter.history, location: mockRouter.location }}
      >
        <UseUrlParamsTestComponent hook={useUrlParams} />
      </UptimeRefreshContext.Provider>
    );

    const setUrlParamsButton = component.find('#setUrlParams');
    setUrlParamsButton.simulate('click');

    expect(mockRouter.history.push).toHaveBeenCalledWith({
      pathname: '',
      search: 'g=%22%22&dateRangeStart=now-12d&dateRangeEnd=now',
    });
  });

  it('gets the expected values using the context', () => {
    const component = mountWithIntl(
      <UptimeRefreshContext.Provider
        value={{
          lastRefresh: 123,
          history: mockRouter.history,
          location: {
            ...mockRouter.location,
            search: 'g=%22%22&dateRangeStart=now-19d&dateRangeEnd=now-1m',
          },
        }}
      >
        <UseUrlParamsTestComponent hook={useUrlParams} />
      </UptimeRefreshContext.Provider>
    );

    const getUrlParamsButton = component.find('#getUrlParams');
    getUrlParamsButton.simulate('click');

    expect(component).toMatchSnapshot();
  });

  it('deletes keys that do not have truthy values', () => {
    mockRouter.location.search = 'g=%22%22&dateRangeStart=now-12&dateRangeEnd=now&pagination=foo';
    const component = mountWithIntl(
      <UptimeRefreshContext.Provider
        value={{
          lastRefresh: 123,
          history: mockRouter.history,
          location: mockRouter.location,
        }}
      >
        <UseUrlParamsTestComponent hook={useUrlParams} updateParams={{ pagination: '' }} />
      </UptimeRefreshContext.Provider>
    );

    const getUrlParamsButton = component.find('#getUrlParams');
    getUrlParamsButton.simulate('click');

    component.update();

    expect(component).toMatchSnapshot();

    const setUrlParmsButton = component.find('#setUrlParams');
    setUrlParmsButton.simulate('click');

    expect(mockRouter.history.push).toHaveBeenCalledWith({
      pathname: '',
      search: 'g=%22%22&dateRangeStart=now-12&dateRangeEnd=now',
    });
  });
});
