/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToOtherBucketColorMappings } from './converter';
import { DEFAULT_COLOR_MAPPING_CONFIG, DEFAULT_OTHER_ASSIGNMENT } from '@kbn/coloring';

describe('normalizeColorMappingConfig', () => {
  it('if there is an assignment for the other bucket, it should remove it and add a corresponding special assignment', () => {
    const configRaw = convertToOtherBucketColorMappings({
      ...DEFAULT_COLOR_MAPPING_CONFIG,
      assignments: [
        {
          rules: [{ type: 'raw', value: '__other__' }],
          color: { type: 'colorCode', colorCode: 'red' },
          touched: false,
        },
        {
          rules: [{ type: 'raw', value: 'cat1' }],
          color: { type: 'colorCode', colorCode: 'blue' },
          touched: false,
        },
      ],
    });

    const configMatch = convertToOtherBucketColorMappings({
      ...DEFAULT_COLOR_MAPPING_CONFIG,
      assignments: [
        {
          rules: [{ type: 'match', pattern: '__other__', matchEntireWord: true }],
          color: { type: 'colorCode', colorCode: 'red' },
          touched: false,
        },
        {
          rules: [{ type: 'raw', value: 'cat1' }],
          color: { type: 'colorCode', colorCode: 'blue' },
          touched: false,
        },
      ],
    });

    const result = {
      ...DEFAULT_COLOR_MAPPING_CONFIG,
      specialAssignments: [
        DEFAULT_OTHER_ASSIGNMENT,
        {
          rules: [{ type: 'others_bucket' }],
          color: { type: 'colorCode', colorCode: 'red' },
          touched: false,
        },
      ],
      assignments: [
        {
          rules: [{ type: 'raw', value: 'cat1' }],
          color: { type: 'colorCode', colorCode: 'blue' },
          touched: false,
        },
      ],
    };

    expect(configRaw).toEqual(result);
    expect(configMatch).toEqual(result);
  });

  it('if there is no assignment for the other bucket, it should return the original config', () => {
    const config = convertToOtherBucketColorMappings({
      ...DEFAULT_COLOR_MAPPING_CONFIG,
      assignments: [],
    });
    expect(config).toEqual(DEFAULT_COLOR_MAPPING_CONFIG);
  });
});
