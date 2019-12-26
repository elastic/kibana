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
        timestamp: {
          us: 0
        },
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

  it('should render a Summary', () => {
    const errorGroup = {
      occurrencesCount: 10,
      error: {
        error: {},
        timestamp: {
          us: 0
        }
      } as any,
      transaction: undefined
    };
    const wrapper = shallow(
      <DetailView
        errorGroup={errorGroup}
        urlParams={{}}
        location={{} as Location}
      />
    ).find('Summary');

    expect(wrapper.exists()).toBe(true);
  });

  it('should render tabs', () => {
    const errorGroup = {
      occurrencesCount: 10,
      transaction: undefined,
      error: {
        timestamp: {
          us: 0
        },
        error: {},
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
        timestamp: {
          us: 0
        },
        error: {},
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

  it('should render without http request info', () => {
    const errorGroup = {
      occurrencesCount: 10,
      transaction: undefined,
      error: {
        timestamp: {
          us: 0
        },
        http: { response: { status_code: 404 } },
        url: { full: 'myUrl' },
        service: { name: 'myService' },
        user: { id: 'myUserId' },
        error: { exception: { handled: true } },
        transaction: { id: 'myTransactionId', sampled: true }
      } as any
    };
    expect(() =>
      shallow(
        <DetailView
          errorGroup={errorGroup}
          urlParams={{}}
          location={{} as Location}
        />
      )
    ).not.toThrowError();
  });
});
