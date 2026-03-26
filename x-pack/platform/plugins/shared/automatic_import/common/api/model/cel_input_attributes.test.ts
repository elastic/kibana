/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { CelDetails, OpenApiDetails } from './cel_input_attributes.gen';

describe('CEL input attributes schema validation', () => {
  describe('CelDetails.path', () => {
    const baseDetails = { path: '/api/v1/events', auth: 'basic' as const };

    test('accepts a valid path', () => {
      expectParseSuccess(CelDetails.safeParse(baseDetails));
    });

    test('rejects empty path', () => {
      expectParseError(CelDetails.safeParse({ ...baseDetails, path: '' }));
    });

    test('rejects whitespace-only path', () => {
      expectParseError(CelDetails.safeParse({ ...baseDetails, path: '   ' }));
    });

    test('rejects path exceeding 2048 chars', () => {
      expectParseError(CelDetails.safeParse({ ...baseDetails, path: '/x'.repeat(1025) }));
    });

    test('accepts path at exactly 2048 chars', () => {
      expectParseSuccess(CelDetails.safeParse({ ...baseDetails, path: 'p'.repeat(2048) }));
    });
  });

  describe('OpenApiDetails', () => {
    const baseDetails = { operation: 'GET /events', schemas: '{}' };

    test('accepts valid OpenAPI details', () => {
      expectParseSuccess(OpenApiDetails.safeParse(baseDetails));
    });

    test('rejects empty operation', () => {
      expectParseError(OpenApiDetails.safeParse({ ...baseDetails, operation: '' }));
    });

    test('rejects whitespace-only operation', () => {
      expectParseError(OpenApiDetails.safeParse({ ...baseDetails, operation: '   ' }));
    });

    test('rejects operation exceeding 65536 chars', () => {
      expectParseError(OpenApiDetails.safeParse({ ...baseDetails, operation: 'x'.repeat(65537) }));
    });

    test('accepts operation at exactly 65536 chars', () => {
      expectParseSuccess(
        OpenApiDetails.safeParse({ ...baseDetails, operation: 'x'.repeat(65536) })
      );
    });

    test('rejects whitespace-only schemas', () => {
      expectParseError(OpenApiDetails.safeParse({ ...baseDetails, schemas: '   ' }));
    });

    test('rejects schemas exceeding 500000 chars', () => {
      expectParseError(OpenApiDetails.safeParse({ ...baseDetails, schemas: 'x'.repeat(500001) }));
    });
  });
});
