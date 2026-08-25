/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOAuthProtectedResource } from './get_oauth_protected_resource';

describe('getOAuthProtectedResource', () => {
  it('prefers the explicitly configured resource', () => {
    expect(
      getOAuthProtectedResource({
        configuredResource: 'https://kibana.example.com/api/agent_builder/mcp',
        publicBaseUrl: 'https://kibana.example.com',
        serverBaseUrl: 'http://localhost:5601',
      })
    ).toBe('https://kibana.example.com/api/agent_builder/mcp');
  });

  it('falls back to the public base URL when no resource is configured, normalizing origin to canonical form', () => {
    expect(
      getOAuthProtectedResource({
        publicBaseUrl: 'https://kibana.example.com',
        serverBaseUrl: 'http://localhost:5601',
      })
    ).toBe('https://kibana.example.com/');
  });

  it('falls back to the server base URL when neither resource nor public base URL is set', () => {
    expect(getOAuthProtectedResource({ serverBaseUrl: 'http://localhost:5601' })).toBe(
      'http://localhost:5601/'
    );
  });

  it('normalizes origin-only URL already with trailing slash — unchanged', () => {
    expect(
      getOAuthProtectedResource({
        publicBaseUrl: 'https://kibana.example.com/',
        serverBaseUrl: 'http://localhost:5601',
      })
    ).toBe('https://kibana.example.com/');
  });

  it('passes a pathed configuredResource through unchanged', () => {
    expect(
      getOAuthProtectedResource({
        configuredResource: 'https://kibana.example.com/api/agent_builder/mcp',
        serverBaseUrl: 'http://localhost:5601',
      })
    ).toBe('https://kibana.example.com/api/agent_builder/mcp');
  });

  it('normalizes a non-canonical server base URL (trailing slash present) to canonical form', () => {
    expect(getOAuthProtectedResource({ serverBaseUrl: 'http://localhost:5601/' })).toBe(
      'http://localhost:5601/'
    );
  });

  it('returns unparseable input verbatim when WHATWG URL throws (e.g. unbracketed IPv6)', () => {
    expect(getOAuthProtectedResource({ serverBaseUrl: 'http://::1:5601' })).toBe(
      'http://::1:5601'
    );
  });

  it('normalizes a bracketed IPv6 origin to canonical form', () => {
    expect(getOAuthProtectedResource({ serverBaseUrl: 'http://[::1]:5601' })).toBe(
      'http://[::1]:5601/'
    );
  });
});
