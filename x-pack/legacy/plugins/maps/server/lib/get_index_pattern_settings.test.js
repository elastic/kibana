/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getIndexPatternSettings } from './get_index_pattern_settings';
import { DEFAULT_MAX_RESULT_WINDOW, DEFAULT_MAX_INNER_RESULT_WINDOW } from '../../common/constants';

describe('max_result_window and max_inner_result_window are not set', () => {
  test('Should provide default values when values not set', () => {
    const indicesSettingsResp = {
      kibana_sample_data_logs: {
        settings: {
          index: {},
        },
      },
    };
    const { maxResultWindow, maxInnerResultWindow } = getIndexPatternSettings(indicesSettingsResp);
    expect(maxResultWindow).toBe(DEFAULT_MAX_RESULT_WINDOW);
    expect(maxInnerResultWindow).toBe(DEFAULT_MAX_INNER_RESULT_WINDOW);
  });

  test('Should include default values when providing minimum values for indices in index pattern', () => {
    const indicesSettingsResp = {
      kibana_sample_data_logs: {
        settings: {
          index: {
            max_result_window: '15000',
            max_inner_result_window: '200',
          },
        },
      },
      kibana_sample_data_flights: {
        settings: {
          index: {},
        },
      },
    };
    const { maxResultWindow, maxInnerResultWindow } = getIndexPatternSettings(indicesSettingsResp);
    expect(maxResultWindow).toBe(DEFAULT_MAX_RESULT_WINDOW);
    expect(maxInnerResultWindow).toBe(DEFAULT_MAX_INNER_RESULT_WINDOW);
  });
});

describe('max_result_window and max_inner_result_window are set', () => {
  test('Should provide values from settings', () => {
    const indicesSettingsResp = {
      kibana_sample_data_logs: {
        settings: {
          index: {
            max_result_window: '15000', // value is returned as string API
            max_inner_result_window: '200',
          },
        },
      },
    };
    const { maxResultWindow, maxInnerResultWindow } = getIndexPatternSettings(indicesSettingsResp);
    expect(maxResultWindow).toBe(15000);
    expect(maxInnerResultWindow).toBe(200);
  });

  test('Should provide minimum values for indices in index pattern', () => {
    const indicesSettingsResp = {
      kibana_sample_data_logs: {
        settings: {
          index: {
            max_result_window: '15000',
            max_inner_result_window: '200',
          },
        },
      },
      kibana_sample_data_flights: {
        settings: {
          index: {
            max_result_window: '7000',
            max_inner_result_window: '75',
          },
        },
      },
    };
    const { maxResultWindow, maxInnerResultWindow } = getIndexPatternSettings(indicesSettingsResp);
    expect(maxResultWindow).toBe(7000);
    expect(maxInnerResultWindow).toBe(75);
  });
});
