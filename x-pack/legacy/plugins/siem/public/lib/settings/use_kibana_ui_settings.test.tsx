/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';

import { DEFAULT_KBN_VERSION, DEFAULT_TIMEZONE_BROWSER } from '../../../common/constants';
import { HookWrapper } from '../../mock/hook_wrapper';
import { useKibanaUiSetting } from './use_kibana_ui_setting';
import { mount } from 'enzyme';

jest.mock('ui/new_platform', () => ({
  npStart: {
    core: {
      injectedMetadata: {
        getKibanaVersion: () => '8.0.0',
      },
    },
  },
  npSetup: {
    core: {
      uiSettings: {
        get$: () => 'world',
      },
    },
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
    const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
    expect(kbnVersion).toEqual('8.0.0');
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
