/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapProfilesApiError } from './errors';

describe('mapProfilesApiError', () => {
  it('maps meta.statusCode for conflict', () => {
    const error = mapProfilesApiError({ meta: { statusCode: 409 } });
    expect(error.kind).toBe('conflict');
  });

  it('maps response.status for forbidden', () => {
    const error = mapProfilesApiError({ response: { status: 403 } });
    expect(error.kind).toBe('forbidden');
  });

  it('maps response.status for not found', () => {
    const error = mapProfilesApiError({ response: { status: 404 } });
    expect(error.kind).toBe('not_found');
  });
});
