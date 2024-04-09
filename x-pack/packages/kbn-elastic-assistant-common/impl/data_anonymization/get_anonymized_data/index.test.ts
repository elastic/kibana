/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAnonymizedValues } from '../get_anonymized_values';
import { mockGetAnonymizedValue } from '../../mock/get_anonymized_value';
import { getAnonymizedData } from '.';

describe('getAnonymizedData', () => {
  const rawData: Record<string, string[]> = {
    doNotReplace: ['this-will-not-be-replaced', 'neither-will-this'],
    empty: [],
    'host.ip': ['127.0.0.1', '10.0.0.1'],
    'host.name': ['test-host'],
    doNotInclude: ['this-will-not-be-included', 'neither-will-this'],
  };

  const commonArgs = {
    anonymizationFields: {
      total: 0,
      page: 1,
      perPage: 100,
      data: [
        {
          id: 'doNotReplace',
          field: 'doNotReplace',
          anonymized: false,
          allowed: true,
        },
        {
          id: 'empty',
          field: 'empty',
          anonymized: true,
          allowed: true,
        },
        {
          id: 'host.ip',
          field: 'host.ip',
          anonymized: true,
          allowed: true,
        },
        {
          id: 'host.name',
          field: 'host.name',
          anonymized: true,
          allowed: true,
        },
      ],
    },
    currentReplacements: {},
    rawData,
    getAnonymizedValue: mockGetAnonymizedValue,
    getAnonymizedValues,
  };

  it('returns the expected anonymized data', () => {
    const result = getAnonymizedData({
      ...commonArgs,
    });

    expect(result.anonymizedData).toEqual({
      doNotReplace: ['this-will-not-be-replaced', 'neither-will-this'],
      empty: [],
      'host.ip': ['1.0.0.721', '1.0.0.01'],
      'host.name': ['tsoh-tset'],
    });
  });

  it('returns the expected map of replaced value to original value', () => {
    const result = getAnonymizedData({
      ...commonArgs,
    });

    expect(result.replacements).toEqual({
      '1.0.0.721': '127.0.0.1',
      '1.0.0.01': '10.0.0.1',
      'tsoh-tset': 'test-host',
    });
  });
});
