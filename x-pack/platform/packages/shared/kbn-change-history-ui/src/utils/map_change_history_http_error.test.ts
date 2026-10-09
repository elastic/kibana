/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapChangeHistoryHttpError } from './map_change_history_http_error';

describe('mapChangeHistoryHttpError', () => {
  it('maps HISTORY_DISABLED from Kibana attributes.code', () => {
    const error = mapChangeHistoryHttpError({
      response: { status: 400 },
      body: {
        message: 'Change history is disabled.',
        attributes: { code: 'HISTORY_DISABLED' },
      },
    });

    expect(error.message).toBe('Change history is disabled.');
    expect((error as Error & { body: { code: string } }).body).toEqual({
      code: 'HISTORY_DISABLED',
      message: 'Change history is disabled.',
    });
  });

  it('maps a top-level structured code', () => {
    const error = mapChangeHistoryHttpError({
      response: { status: 409 },
      body: {
        code: 'RESTORE_CONFLICT',
        message: 'Object was updated by another user.',
      },
    });

    expect((error as Error & { body: { code: string } }).body.code).toBe('RESTORE_CONFLICT');
  });

  it('maps validation failures from validationErrors on 400 responses', () => {
    const error = mapChangeHistoryHttpError({
      response: { status: 400 },
      body: {
        message: 'YAML validation failed.',
        validationErrors: ['invalid step'],
      },
    });

    expect((error as Error & { body: { code: string } }).body.code).toBe('RESTORE_VALIDATION');
  });

  it('uses UNKNOWN for unlabeled 400 responses instead of RESTORE_VALIDATION', () => {
    const error = mapChangeHistoryHttpError({
      response: { status: 400 },
      body: {
        message: 'Change history is disabled.',
      },
    });

    expect((error as Error & { body: { code: string } }).body.code).toBe('UNKNOWN');
  });

  it('falls back to HTTP status when no structured code is present', () => {
    const error = mapChangeHistoryHttpError({
      response: { status: 403 },
      body: { message: 'Forbidden' },
    });

    expect((error as Error & { body: { code: string } }).body.code).toBe('FORBIDDEN');
  });

  it('returns non-http errors unchanged', () => {
    const original = new Error('local failure');
    expect(mapChangeHistoryHttpError(original)).toBe(original);
  });
});
