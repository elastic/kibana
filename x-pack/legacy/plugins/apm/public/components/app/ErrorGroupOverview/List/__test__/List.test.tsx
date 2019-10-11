/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { mockMoment, toJson } from '../../../../../utils/testHelpers';
import { ErrorGroupList } from '../index';
import props from './props.json';
import { IUrlParams } from '../../../../../context/UrlParamsContext/types';
import {
  useUiFilters,
  UrlParamsContext
} from '../../../../../context/UrlParamsContext';

const mockRefreshTimeRange = jest.fn();
const MockUrlParamsProvider: React.FC<{
  params?: IUrlParams;
}> = ({ params = props.urlParams, children }) => (
  <UrlParamsContext.Provider
    value={{
      urlParams: params,
      refreshTimeRange: mockRefreshTimeRange,
      uiFilters: useUiFilters(params)
    }}
    children={children}
  />
);

describe('ErrorGroupOverview -> List', () => {
  beforeAll(() => {
    mockMoment();
  });

  it('should render empty state', () => {
    const storeState = {};
    const wrapper = mount(
      <MockUrlParamsProvider>
        <ErrorGroupList items={[]} />
      </MockUrlParamsProvider>,
      storeState
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  it('should render with data', () => {
    const wrapper = mount(
      <MockUrlParamsProvider>
        <ErrorGroupList items={props.items} />
      </MockUrlParamsProvider>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
