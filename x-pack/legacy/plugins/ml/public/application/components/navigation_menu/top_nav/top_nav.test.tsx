/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { EuiSuperDatePicker } from '@elastic/eui';

import { uiTimefilterMock } from '../../../contexts/ui/__mocks__/mocks_jest';
import { mlTimefilterRefresh$ } from '../../../services/timefilter_refresh_service';

import { TopNav } from './top_nav';

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

    const wrapper = mount(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );
    expect(wrapper.find(TopNav)).toHaveLength(1);
    expect(wrapper.find('EuiSuperDatePicker')).toHaveLength(1);
    expect(refreshListener).toBeCalledTimes(0);

    refreshSubscription.unsubscribe();
  });

  // The following tests are written against EuiSuperDatePicker
  // instead of TopNav. TopNav uses hooks and we cannot write tests
  // with async hook updates yet until React 16.9 is available.
  test('Listen for consecutive super date picker refreshs.', async () => {
    const onRefresh = jest.fn();

    const componentRefresh = mount(
      <EuiSuperDatePicker
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
      <EuiSuperDatePicker
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
