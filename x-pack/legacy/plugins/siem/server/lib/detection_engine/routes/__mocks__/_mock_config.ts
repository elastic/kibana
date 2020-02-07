/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { APP_ID, SIGNALS_INDEX_KEY } from '../../../../../common/constants';

const defaultConfig = {
  'kibana.index': '.kibana',
  [`xpack.${APP_ID}.${SIGNALS_INDEX_KEY}`]: '.siem-signals',
};

const isKibanaConfig = (config: unknown): config is Legacy.KibanaConfig =>
  Object.getOwnPropertyDescriptor(config, 'get') != null &&
  Object.getOwnPropertyDescriptor(config, 'has') != null;

const assertNever = (): never => {
  throw new Error('Unexpected object');
};

export const createMockConfig = (
  config: Record<string, string> = defaultConfig
): (() => Legacy.KibanaConfig) => () => {
  const returnConfig = {
    get(key: string) {
      return config[key];
    },
    has(key: string) {
      return config[key] != null;
    },
  };
  if (isKibanaConfig(returnConfig)) {
    return returnConfig;
  } else {
    return assertNever();
  }
};
