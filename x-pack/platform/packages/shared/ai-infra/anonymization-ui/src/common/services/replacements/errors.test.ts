/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapReplacementsApiError } from './errors';

describe('mapReplacementsApiError', () => {
  it('maps meta.statusCode for unauthorized', () => {
    const error = mapReplacementsApiError({ meta: { statusCode: 401 } });
    expect(error.kind).toBe('unauthorized');
  });

  it('maps response.status for forbidden', () => {
    const error = mapReplacementsApiError({ response: { status: 403 } });
    expect(error.kind).toBe('forbidden');
  });

  it('maps response.status for not found', () => {
    const error = mapReplacementsApiError({ response: { status: 404 } });
    expect(error.kind).toBe('not_found');
  });
});
