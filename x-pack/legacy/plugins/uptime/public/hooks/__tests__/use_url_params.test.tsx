/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React, { useState, Fragment } from 'react';
import { useUrlParams, UptimeUrlParamsHook } from '../use_url_params';
import { RouteComponentProps } from 'react-router';

interface MockUrlParamsComponentProps {
  hook: UptimeUrlParamsHook;
}

let mockRouter: RouteComponentProps;

const UseUrlParamsTestComponent = ({ hook }: MockUrlParamsComponentProps) => {
  const [params, setParams] = useState({});
  const [getUrlParams, updateUrlParams, setRouter] = hook();
  return (
    <Fragment>
      {Object.keys(params).length > 0 ? <div>{JSON.stringify(params)}</div> : null}
      <button id="setRouter" onClick={() => setRouter(mockRouter)}>
        Set router
      </button>
      <button
        id="setUrlParams"
        onClick={() => {
          updateUrlParams({ dateRangeStart: 'now-12d', dateRangeEnd: 'now' });
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
  });

  it('accepts router props, updates URL params, and returns the current params', async () => {
    const component = shallowWithIntl(<UseUrlParamsTestComponent hook={useUrlParams} />);

    const setRouterButton = component.find('#setRouter');
    await setRouterButton.simulate('click');

    const setUrlParamsButton = component.find('#setUrlParams');
    await setUrlParamsButton.simulate('click');

    const getUrlParamsButton = component.find('#getUrlParams');
    await getUrlParamsButton.simulate('click');

    expect(component).toMatchSnapshot();
    expect(mockRouter.history.push).toHaveBeenCalled();
  });
});
