/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { Location } from 'history';
import React from 'react';
import { mockMoment } from '../../../../utils/testHelpers';
import { DetailView } from './index';

jest.mock('ui/kfetch');

describe('DetailView', () => {
  beforeEach(() => {
    // Avoid timezone issues
    mockMoment();
  });

  it('should render empty state', () => {
    const wrapper = shallow(
      <DetailView
        errorGroup={{} as any}
        urlParams={{}}
        location={{} as Location}
      />
    );
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('should render Discover button', () => {
    const errorGroup = {
      occurrencesCount: 10,
      transaction: undefined,
      error: {
        '@timestamp': 'myTimestamp',
        http: { request: { method: 'GET' } },
        url: { full: 'myUrl' },
        service: { name: 'myService' },
        user: { id: 'myUserId' },
        error: { exception: { handled: true } },
        transaction: { id: 'myTransactionId', sampled: true }
      } as any
    };

    const wrapper = shallow(
      <DetailView
        errorGroup={errorGroup}
        urlParams={{}}
        location={{} as Location}
      />
    ).find('DiscoverErrorLink');

    expect(wrapper.exists()).toBe(true);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render StickyProperties', () => {
    const errorGroup = {
      occurrencesCount: 10,
      error: {} as any,
      transaction: undefined
    };
    const wrapper = shallow(
      <DetailView
        errorGroup={errorGroup}
        urlParams={{}}
        location={{} as Location}
      />
    ).find('StickyErrorProperties');

    expect(wrapper.exists()).toBe(true);
  });

  it('should render tabs', () => {
    const errorGroup = {
      occurrencesCount: 10,
      transaction: undefined,
      error: {
        '@timestamp': 'myTimestamp',
        service: {},
        user: {}
      } as any
    };
    const wrapper = shallow(
      <DetailView
        errorGroup={errorGroup}
        urlParams={{}}
        location={{} as Location}
      />
    ).find('EuiTabs');

    expect(wrapper.exists()).toBe(true);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render TabContent', () => {
    const errorGroup = {
      occurrencesCount: 10,
      transaction: undefined,
      error: {
        '@timestamp': 'myTimestamp',
        context: {}
      } as any
    };
    const wrapper = shallow(
      <DetailView
        errorGroup={errorGroup}
        urlParams={{}}
        location={{} as Location}
      />
    ).find('TabContent');

    expect(wrapper.exists()).toBe(true);
    expect(wrapper).toMatchSnapshot();
  });
});
