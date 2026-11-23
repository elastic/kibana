/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isManagedOtlpEndpointUrl } from './managed_otlp_endpoint';

describe('isManagedOtlpEndpointUrl', () => {
  const managedUrl = 'https://managed.example.com';

  it('should be false without a managed endpoint', () => {
    expect(isManagedOtlpEndpointUrl('managed.example.com:443', undefined)).toBe(false);
  });

  it.each(['managed.example.com', 'managed.example.com:443', 'https://managed.example.com:443'])(
    'should match %p whatever its scheme and port',
    (endpoint) => {
      expect(isManagedOtlpEndpointUrl(endpoint, managedUrl)).toBe(true);
    }
  );

  it.each(['other.example.com:443', 'managed.example.com/other-path'])(
    'should not match %p',
    (endpoint) => {
      expect(isManagedOtlpEndpointUrl(endpoint, managedUrl)).toBe(false);
    }
  );
});
