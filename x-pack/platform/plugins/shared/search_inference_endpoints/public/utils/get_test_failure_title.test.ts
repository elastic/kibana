/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestEndpointFailureCause } from '../../common/types';
import { getTestFailureTitle } from './get_test_failure_title';

describe('getTestFailureTitle', () => {
  it.each<[TestEndpointFailureCause, string]>([
    ['auth', 'Authentication failed. Check the API key.'],
    ['quota', 'Rate limit or quota exceeded.'],
    ['timeout', 'The endpoint did not respond in time.'],
    ['not_found', 'Endpoint or model not found. Check the model ID.'],
    ['bad_request', 'The provider rejected the request.'],
    ['provider_error', 'The provider had an error. Try again later.'],
    ['no_endpoint', 'No model is available for this feature.'],
    ['unknown', 'The endpoint test failed.'],
  ])('returns the title for cause %s', (cause, title) => {
    expect(getTestFailureTitle(cause)).toBe(title);
  });
});
