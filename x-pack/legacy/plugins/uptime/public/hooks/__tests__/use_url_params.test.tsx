/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import React, { useState, Fragment } from 'react';
import { useUrlParams, UptimeUrlParamsHook } from '../use_url_params';
import { UptimeRefreshContext } from '../../contexts';
import { mountWithRouter } from '../../lib';
import { createMemoryHistory } from 'history';

interface MockUrlParamsComponentProps {
  hook: UptimeUrlParamsHook;
  updateParams?: { [key: string]: any };
}

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
    dateMathSpy = jest.spyOn(DateMath, 'parse');
    dateMathSpy.mockReturnValue(MOCK_DATE_VALUE);
  });

  it('accepts router props, updates URL params, and returns the current params', () => {
    const history = createMemoryHistory();
    jest.spyOn(history, 'push');

    const component = mountWithRouter(
      <UptimeRefreshContext.Provider value={{ lastRefresh: 123, refreshApp: jest.fn() }}>
        <UseUrlParamsTestComponent hook={useUrlParams} />
      </UptimeRefreshContext.Provider>,
      history
    );

    const setUrlParamsButton = component.find('#setUrlParams');
    setUrlParamsButton.simulate('click');
    expect(history.push).toHaveBeenCalledWith({
      pathname: '/',
      search: 'dateRangeStart=now-12d&dateRangeEnd=now',
    });
  });

  it('gets the expected values using the context', () => {
    const component = mountWithRouter(
      <UptimeRefreshContext.Provider
        value={{
          lastRefresh: 123,
          refreshApp: jest.fn(),
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
    const history = createMemoryHistory({
      initialEntries: ['/?g=%22%22&dateRangeStart=now-12&dateRangeEnd=now&pagination=foo'],
    });
    history.location.key = 'test';

    jest.spyOn(history, 'push');
    const component = mountWithRouter(
      <UptimeRefreshContext.Provider
        value={{
          lastRefresh: 123,
          refreshApp: jest.fn(),
        }}
      >
        <UseUrlParamsTestComponent hook={useUrlParams} updateParams={{ pagination: '' }} />
      </UptimeRefreshContext.Provider>,
      history
    );

    const getUrlParamsButton = component.find('#getUrlParams');
    getUrlParamsButton.simulate('click');

    component.update();

    expect(component).toMatchSnapshot();

    const setUrlParamsButton = component.find('#setUrlParams');
    setUrlParamsButton.simulate('click');

    expect(history.push).toHaveBeenCalledWith({
      pathname: '/',
      search: 'g=%22%22&dateRangeStart=now-12&dateRangeEnd=now',
    });
  });
});
