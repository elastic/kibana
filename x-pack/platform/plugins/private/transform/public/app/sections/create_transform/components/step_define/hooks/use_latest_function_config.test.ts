/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LatestFunctionConfigUI } from '../../../../../../../common/types/transform';

import { latestConfigMapper, validateLatestConfig } from './use_latest_function_config';

describe('useLatestFunctionConfig', () => {
  it('should return a valid configuration', () => {
    const config: LatestFunctionConfigUI = {
      unique_key: [{ label: 'the-unique-key-label', value: 'the-unique-key' }],
      sort: { label: 'the-sort-label', value: 'the-sort' },
    };

    const apiConfig = latestConfigMapper.toAPIConfig(config);

    expect(apiConfig).toEqual({
      unique_key: ['the-unique-key'],
      sort: 'the-sort',
    });
    expect(validateLatestConfig(apiConfig).isValid).toBe(true);
  });

  it('should return an invalid partial configuration', () => {
    const config: LatestFunctionConfigUI = {
      unique_key: [{ label: 'the-unique-key-label', value: 'the-unique-key' }],
      sort: { label: 'the-sort-label', value: undefined },
    };

    const apiConfig = latestConfigMapper.toAPIConfig(config);

    expect(apiConfig).toEqual({
      unique_key: ['the-unique-key'],
      sort: '',
    });
    expect(validateLatestConfig(apiConfig).isValid).toBe(false);
  });

  it('should return false for isValid if no configuration given', () => {
    expect(validateLatestConfig().isValid).toBe(false);
  });
});
