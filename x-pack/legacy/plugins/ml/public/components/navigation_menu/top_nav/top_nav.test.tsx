/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { uiTimefilterMock } from '../../../contexts/ui/__mocks__/mocks';
import { mlTimefilterRefresh$ } from '../../../services/timefilter_refresh_service';

import { MlSuperDatePickerWithUpdate, TopNav } from './top_nav';

uiTimefilterMock.enableAutoRefreshSelector();
uiTimefilterMock.enableTimeRangeSelector();

jest.mock('../../../contexts/ui/use_ui_context');

const noop = () => {};

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

  // The following tests are written against MlSuperDatePickerWithUpdate
  // instead of TopNav. TopNav uses hooks and we cannot writing tests
  // with async hook updates yet until React 16.9 is available.

  // MlSuperDatePickerWithUpdate fixes an issue with EuiSuperDatePicker
  // which didn't make it into Kibana 7.4. We should be able to just
  // use EuiSuperDatePicker again once the following PR is in EUI:
  // https://github.com/elastic/eui/pull/2298

  test('Listen for consecutive super date picker refreshs.', async () => {
    const onRefresh = jest.fn();

    const componentRefresh = mount(
      <MlSuperDatePickerWithUpdate
        onTimeChange={noop}
        isPaused={false}
        onRefresh={onRefresh}
        refreshInterval={10}
      />
    );

    const instanceRefresh = componentRefresh.instance();

    jest.advanceTimersByTime(10);
    // @ts-ignore
    await instanceRefresh.asyncInterval.__pendingFn;
    jest.advanceTimersByTime(10);
    // @ts-ignore
    await instanceRefresh.asyncInterval.__pendingFn;

    expect(onRefresh).toBeCalledTimes(2);
  });

  test('Switching refresh interval to pause should stop onRefresh being called.', async () => {
    const onRefresh = jest.fn();

    const componentRefresh = mount(
      <MlSuperDatePickerWithUpdate
        onTimeChange={noop}
        isPaused={false}
        onRefresh={onRefresh}
        refreshInterval={10}
      />
    );

    const instanceRefresh = componentRefresh.instance();

    jest.advanceTimersByTime(10);
    // @ts-ignore
    await instanceRefresh.asyncInterval.__pendingFn;
    componentRefresh.setProps({ isPaused: true, refreshInterval: 0 });
    jest.advanceTimersByTime(10);
    // @ts-ignore
    await instanceRefresh.asyncInterval.__pendingFn;

    expect(onRefresh).toBeCalledTimes(1);
  });
});
