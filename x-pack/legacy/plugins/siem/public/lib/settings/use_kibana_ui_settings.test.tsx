/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';

import { DEFAULT_KBN_VERSION, DEFAULT_TIMEZONE_BROWSER } from '../../../common/constants';
import { HookWrapper } from '../../mock/hook_wrapper';
import { useKibanaCore } from '../compose/kibana_core';
import { useKibanaUiSetting } from './use_kibana_ui_setting';
import { mount } from 'enzyme';

const mockUseKibanaCore = useKibanaCore as jest.Mock;
jest.mock('../compose/kibana_core');
mockUseKibanaCore.mockImplementation(() => ({
  injectedMetadata: {
    getKibanaVersion: () => '8.0.0',
  },
  uiSettings: {
    get$: () => 'world',
  },
}));

jest.mock('ui/vis/lib/timezone', () => ({
  timezoneProvider: () => () => 'America/New_York',
}));

jest.mock('./use_observable', () => ({
  useObservable: (val: string) => val,
}));

describe('useKibanaUiSetting', () => {
  test('getKibanaVersion', () => {
    const wrapper = mount(<HookWrapper hook={() => useKibanaUiSetting(DEFAULT_KBN_VERSION)} />);
    expect(wrapper.text()).toEqual('["8.0.0"]');
  });

  test('getTimezone', () => {
    const wrapper = mount(
      <HookWrapper hook={() => useKibanaUiSetting(DEFAULT_TIMEZONE_BROWSER)} />
    );
    expect(wrapper.text()).toEqual('["America/New_York"]');
  });

  test('get any ui settings', () => {
    const wrapper = mount(<HookWrapper hook={() => useKibanaUiSetting('hello')} />);
    expect(wrapper.text()).toEqual('["world",null]');
  });
});
