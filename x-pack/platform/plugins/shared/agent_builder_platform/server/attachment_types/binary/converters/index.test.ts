/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentConverters } from './types';
import { getAvailableDocumentMimeTypes } from '.';

describe('getAvailableDocumentMimeTypes', () => {
  const createConverters = (pdfAvailable: boolean): DocumentConverters => ({
    'application/pdf': { isAvailable: () => pdfAvailable, toText: jest.fn() },
  });

  it('returns PDF when the converter is available', () => {
    expect(getAvailableDocumentMimeTypes(createConverters(true))).toEqual(['application/pdf']);
  });

  it('returns nothing when the converter is not available', () => {
    expect(getAvailableDocumentMimeTypes(createConverters(false))).toEqual([]);
  });
});
