/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';

import {
  getOtlpAuthHeaders,
  omitRemovedOtlpAuthSettings,
  validateOtlpAuth,
  withRemovedOtlpAuthSettings,
} from './otlp_auth';

jest.mock('../app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

describe('OTLP output authentication', () => {
  beforeEach(() => {
    mockedAppContextService.getCloud.mockReturnValue({
      managedOtlp: { url: 'https://managed.ingest.elastic.cloud' },
    } as any);
  });

  describe('getOtlpAuthHeaders', () => {
    it.each([
      ['api_key' as const, 'ApiKey $co.elastic.secret{id1}'],
      ['bearer_token' as const, 'Bearer $co.elastic.secret{id1}'],
    ])('returns the Authorization header for the %s scheme', (scheme, expected) => {
      expect(getOtlpAuthHeaders({ type: 'auth_header', scheme }, { id: 'id1' })).toEqual({
        Authorization: expected,
      });
    });

    it('returns the custom header with the secret reference as value', () => {
      expect(
        getOtlpAuthHeaders({ type: 'custom_header', name: 'x-api-key' }, { id: 'id1' })
      ).toEqual({ 'x-api-key': '$co.elastic.secret{id1}' });
    });

    it('returns nothing without authentication or without a stored credential', () => {
      expect(getOtlpAuthHeaders(undefined, { id: 'id1' })).toBeUndefined();
      expect(
        getOtlpAuthHeaders({ type: 'auth_header', scheme: 'api_key' }, undefined)
      ).toBeUndefined();
      // a plain text value is never put in the policy
      expect(
        getOtlpAuthHeaders({ type: 'auth_header', scheme: 'api_key' }, 'plain' as any)
      ).toBeUndefined();
    });
  });

  describe('validateOtlpAuth', () => {
    const endpoint = 'https://collector.example.com:4318';

    it('accepts an authentication with a credential', () => {
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'custom_header', name: 'x-api-key' },
          hasCredential: true,
          endpoint,
          headers: { 'x-tenant': 'acme' },
        })
      ).not.toThrow();
    });

    it('accepts no authentication and no credential', () => {
      expect(() =>
        validateOtlpAuth({ auth: null, hasCredential: false, endpoint, headers: undefined })
      ).not.toThrow();
    });

    it('rejects a credential without authentication', () => {
      expect(() =>
        validateOtlpAuth({ auth: undefined, hasCredential: true, endpoint, headers: undefined })
      ).toThrow('secrets.auth.credential can only be set together with auth');
    });

    it('rejects an authentication without a credential', () => {
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'auth_header', scheme: 'api_key' },
          hasCredential: false,
          endpoint,
          headers: undefined,
        })
      ).toThrow('secrets.auth.credential is required when auth is set');
    });

    it('rejects an authentication for the managed OTLP endpoint', () => {
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'auth_header', scheme: 'api_key' },
          hasCredential: true,
          endpoint: 'managed.ingest.elastic.cloud:443',
          headers: undefined,
        })
      ).toThrow('auth cannot be set for an output that sends data to the managed OTLP endpoint');
    });

    it('rejects a header that the authentication sets, whatever its case', () => {
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'auth_header', scheme: 'bearer_token' },
          hasCredential: true,
          endpoint,
          headers: { authorization: 'Basic abc' },
        })
      ).toThrow(
        'otlp_exporter.headers cannot contain the "authorization" header, it is set by auth'
      );
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'custom_header', name: 'X-Api-Key' },
          hasCredential: true,
          endpoint,
          headers: { 'x-api-key': 'value' },
        })
      ).toThrow('otlp_exporter.headers cannot contain the "x-api-key" header, it is set by auth');
    });
  });

  describe('withRemovedOtlpAuthSettings', () => {
    it('removes the settings of the stored authentication type', () => {
      expect(
        withRemovedOtlpAuthSettings(
          { type: 'custom_header', name: 'x-api-key' },
          { type: 'auth_header', scheme: 'api_key' }
        )
      ).toEqual({ type: 'custom_header', name: 'x-api-key', scheme: null });
    });

    it('returns the authentication as it is when nothing is removed', () => {
      const auth = { type: 'auth_header' as const, scheme: 'bearer_token' as const };
      expect(withRemovedOtlpAuthSettings(auth, { type: 'auth_header', scheme: 'api_key' })).toBe(
        auth
      );
    });
  });

  describe('omitRemovedOtlpAuthSettings', () => {
    it('drops the removed settings', () => {
      expect(
        omitRemovedOtlpAuthSettings({
          type: 'custom_header',
          name: 'x-api-key',
          scheme: null,
        } as any)
      ).toEqual({ type: 'custom_header', name: 'x-api-key' });
    });

    it('returns nothing without authentication', () => {
      expect(omitRemovedOtlpAuthSettings(null)).toBeUndefined();
    });
  });
});
