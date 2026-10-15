/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedDocumentMimeType } from '@kbn/agent-builder-common/attachments';
import type { DocumentConverter, DocumentConverters } from './types';
import { getAvailableDocumentMimeTypes } from '.';

describe('getAvailableDocumentMimeTypes', () => {
  const createConverter = (available: boolean): DocumentConverter => ({
    isAvailable: () => available,
    toText: jest.fn(),
  });

  const createConverters = (
    availability: Record<SupportedDocumentMimeType, boolean>
  ): DocumentConverters => ({
    'application/pdf': createConverter(availability['application/pdf']),
    'text/markdown': createConverter(availability['text/markdown']),
    'text/plain': createConverter(availability['text/plain']),
  });

  it('returns all types in the order of the supported list', () => {
    const converters = createConverters({
      'application/pdf': true,
      'text/markdown': true,
      'text/plain': true,
    });
    expect(getAvailableDocumentMimeTypes(converters)).toEqual([
      'application/pdf',
      'text/markdown',
      'text/plain',
    ]);
  });

  it('leaves out the types that are not available', () => {
    const converters = createConverters({
      'application/pdf': false,
      'text/markdown': true,
      'text/plain': true,
    });
    expect(getAvailableDocumentMimeTypes(converters)).toEqual(['text/markdown', 'text/plain']);
  });
});
