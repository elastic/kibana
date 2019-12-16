/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

import {
  DEFAULT_SIEM_TIME_RANGE,
  DEFAULT_SIEM_REFRESH_INTERVAL,
  DEFAULT_INDEX_KEY,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_TZ,
  DEFAULT_DARK_MODE,
  DEFAULT_TIME_RANGE,
  DEFAULT_REFRESH_RATE_INTERVAL,
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_INTERVAL_PAUSE,
  DEFAULT_INTERVAL_VALUE,
} from '../../common/constants';
import { defaultIndexPattern } from '../../default_index_pattern';
import { createKibanaCoreStartMock, createKibanaPluginsStartMock } from './kibana_core';

export const createUseUiSetting$Mock = () => <T extends unknown = string>(
  key: string,
  defaultValue?: T
): [T, () => void] | undefined => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: Record<string, any> = {
    [DEFAULT_TIME_RANGE]: { from: 'now-15m', to: 'now', mode: 'quick' },
    [DEFAULT_REFRESH_RATE_INTERVAL]: { pause: false, value: 0 },
    [DEFAULT_SIEM_TIME_RANGE]: {
      from: DEFAULT_FROM,
      to: DEFAULT_TO,
    },
    [DEFAULT_SIEM_REFRESH_INTERVAL]: {
      pause: DEFAULT_INTERVAL_PAUSE,
      value: DEFAULT_INTERVAL_VALUE,
    },
    [DEFAULT_INDEX_KEY]: defaultIndexPattern,
    [DEFAULT_DATE_FORMAT_TZ]: 'Asia/Taipei',
    [DEFAULT_DATE_FORMAT]: 'MMM D, YYYY @ HH:mm:ss.SSS',
    [DEFAULT_DARK_MODE]: false,
  };

  const result = mock[key];

  if (typeof result != null) {
    return [result, jest.fn()];
  }

  if (defaultValue != null) {
    return [defaultValue, jest.fn()];
  }

  throw new Error(`Unexpected config key: ${key}`);
};

export const createUseKibanaMock = () => () => ({
  services: { ...createKibanaCoreStartMock(), ...createKibanaPluginsStartMock() },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createWithKibanaMock = () => (Component: any) => (props: any) => {
  return <Component {...props} kibana={createUseKibanaMock()()} />;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createKibanaContextProviderMock = () => ({ services, ...rest }: any) => (
  <KibanaContextProvider
    {...rest}
    services={{ ...createUseKibanaMock()().services, ...services }}
  />
);
