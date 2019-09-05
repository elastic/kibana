/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { uiTimefilterMock } from '../../../contexts/ui/__mocks__/mocks';
import { mlTimefilterRefresh$ } from '../../../services/timefilter_refresh_service';

import { TopNav } from './top_nav';

uiTimefilterMock.enableAutoRefreshSelector();
uiTimefilterMock.enableTimeRangeSelector();

jest.mock('../../../contexts/ui/use_ui_context');

describe('Navigation Menu: <TopNav />', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Minimal initialization.', () => {
    const refreshListener = jest.fn();
    const refreshSubscription = mlTimefilterRefresh$.subscribe(refreshListener);

    const wrapper = shallow(<TopNav />);
    expect(wrapper).toMatchSnapshot();
    expect(refreshListener).toBeCalledTimes(0);

    refreshSubscription.unsubscribe();
  });

  test('Listen for super date picker refresh.', done => {
    const refreshListener = jest.fn();
    const refreshSubscription = mlTimefilterRefresh$.subscribe(refreshListener);

    uiTimefilterMock.setRefreshInterval({ value: 5, pause: false });

    mount(<TopNav />);

    setTimeout(() => {
      expect(refreshListener).toBeCalledTimes(1);
      refreshSubscription.unsubscribe();
      done();
    }, 10);

    jest.runOnlyPendingTimers();
  });

  test('Switching refresh interval to pause should stop listener being called.', done => {
    const refreshListener = jest.fn();
    const refreshSubscription = mlTimefilterRefresh$.subscribe(refreshListener);

    uiTimefilterMock.setRefreshInterval({ value: 5, pause: false });

    mount(<TopNav />);

    setTimeout(() => {
      uiTimefilterMock.setRefreshInterval({ value: 0, pause: true });
    }, 10);

    setTimeout(() => {
      expect(refreshListener).toBeCalledTimes(2);
      refreshSubscription.unsubscribe();
      done();
    }, 20);

    jest.runOnlyPendingTimers();
  });
});
