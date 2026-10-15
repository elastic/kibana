/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BinaryConverters } from './types';
import { getAvailableBinaryMimeTypes } from '.';

describe('getAvailableBinaryMimeTypes', () => {
  const createConverters = (pdfAvailable: boolean): BinaryConverters => ({
    'application/pdf': { isAvailable: () => pdfAvailable, toText: jest.fn() },
  });

  it('returns PDF when the converter is available', () => {
    expect(getAvailableBinaryMimeTypes(createConverters(true))).toEqual(['application/pdf']);
  });

  it('returns nothing when the converter is not available', () => {
    expect(getAvailableBinaryMimeTypes(createConverters(false))).toEqual([]);
  });
});
