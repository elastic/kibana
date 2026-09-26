/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint @typescript-eslint/no-var-requires: 0 */

jest.mock('../../../kibana_services', () => ({}));

import { getInitialRefreshConfig } from './get_initial_refresh_config';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import type { MapAttributes } from '../../../../server';

const DEFAULT_REFRESH_CONFIG = { pause: true, value: 0 };

describe('getInitialRefreshConfig', () => {
  beforeEach(() => {
    require('../../../kibana_services').getUiSettings = jest.fn().mockReturnValue({
      get: (key: string) => {
        if (key === UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS) {
          return DEFAULT_REFRESH_CONFIG;
        }
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return refreshInterval from mapState when stored with map', () => {
    const mapState = { refreshInterval: { pause: true, value: 1000 } } as unknown as MapAttributes;
    const result = getInitialRefreshConfig({ mapState, globalState: {} });
    expect(result).toEqual({ pause: true, value: 1000 });
  });

  it('should return default refresh config when mapState has no refreshInterval', () => {
    const result = getInitialRefreshConfig({ mapState: undefined, globalState: {} });
    expect(result).toEqual(DEFAULT_REFRESH_CONFIG);
  });

  it('should merge globalState refreshInterval over default when mapState has no refreshInterval', () => {
    const result = getInitialRefreshConfig({
      mapState: undefined,
      globalState: { refreshInterval: { pause: false, value: 5000 } },
    });
    expect(result).toEqual({ pause: false, value: 5000 });
  });
});
