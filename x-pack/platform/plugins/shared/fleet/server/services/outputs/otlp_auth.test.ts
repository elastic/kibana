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
  validateOtlpAuthCredential,
  withRemovedOtlpAuthSettings,
  withTrimmedOtlpAuthCredential,
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
    const exporter = {
      endpoint: 'https://collector.example.com:4318',
      protocol: 'http/protobuf' as const,
    };

    it.each([
      ['api_key' as const, 'ApiKey $co.elastic.secret{id1}'],
      ['bearer_token' as const, 'Bearer $co.elastic.secret{id1}'],
    ])('returns the Authorization header for the %s scheme', (scheme, expected) => {
      expect(getOtlpAuthHeaders({ type: 'auth_header', scheme }, { id: 'id1' }, exporter)).toEqual({
        Authorization: expected,
      });
    });

    it('returns the custom header with the secret reference as value', () => {
      expect(
        getOtlpAuthHeaders({ type: 'custom_header', name: 'x-api-key' }, { id: 'id1' }, exporter)
      ).toEqual({ 'x-api-key': '$co.elastic.secret{id1}' });
    });

    it('returns nothing without authentication or without a stored credential', () => {
      expect(getOtlpAuthHeaders(undefined, { id: 'id1' }, exporter)).toBeUndefined();
      expect(
        getOtlpAuthHeaders({ type: 'auth_header', scheme: 'api_key' }, undefined, exporter)
      ).toBeUndefined();
      // a plain text value is never put in the policy
      expect(
        getOtlpAuthHeaders({ type: 'auth_header', scheme: 'api_key' }, 'plain' as any, exporter)
      ).toBeUndefined();
    });

    it('returns nothing for the managed OTLP endpoint', () => {
      expect(
        getOtlpAuthHeaders(
          { type: 'auth_header', scheme: 'api_key' },
          { id: 'id1' },
          { endpoint: 'managed.ingest.elastic.cloud:443', protocol: 'grpc' }
        )
      ).toBeUndefined();
    });

    it('returns nothing when a signal is sent to the managed OTLP endpoint', () => {
      expect(
        getOtlpAuthHeaders(
          { type: 'auth_header', scheme: 'api_key' },
          { id: 'id1' },
          {
            ...exporter,
            logs_endpoint: 'https://managed.ingest.elastic.cloud/v1/logs',
          }
        )
      ).toBeUndefined();
    });
  });

  describe('validateOtlpAuthCredential', () => {
    it('accepts a new value', () => {
      expect(() => validateOtlpAuthCredential('my-key')).not.toThrow();
    });

    it('rejects a value with control characters', () => {
      expect(() => validateOtlpAuthCredential('my\nkey')).toThrow(
        'secrets.auth.credential cannot contain control characters'
      );
    });

    it('accepts the reference to the credential of the output', () => {
      expect(() => validateOtlpAuthCredential({ id: 'stored' }, { id: 'stored' })).not.toThrow();
    });

    it('rejects the reference to any other secret', () => {
      const error =
        'secrets.auth.credential must be a new value, or the reference to the credential of this output';
      expect(() => validateOtlpAuthCredential({ id: 'other' })).toThrow(error);
      expect(() => validateOtlpAuthCredential({ id: 'other' }, { id: 'stored' })).toThrow(error);
    });
  });

  describe('withTrimmedOtlpAuthCredential', () => {
    it('trims the credential', () => {
      expect(
        withTrimmedOtlpAuthCredential({ secrets: { auth: { credential: ' my-key\n' } } })
      ).toEqual({ secrets: { auth: { credential: 'my-key' } } });
    });

    it('returns the output as it is without a value to trim', () => {
      const output = { secrets: { auth: { credential: { id: 'stored' } } } };
      expect(withTrimmedOtlpAuthCredential(output)).toBe(output);
    });
  });

  describe('validateOtlpAuth', () => {
    const exporter = {
      endpoint: 'https://collector.example.com:4318',
      protocol: 'http/protobuf' as const,
    };

    it('accepts an authentication with a credential', () => {
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'custom_header', name: 'x-api-key' },
          hasCredential: true,
          exporter: { ...exporter, headers: { 'x-tenant': 'acme' } },
        })
      ).not.toThrow();
    });

    it('accepts no authentication and no credential', () => {
      expect(() => validateOtlpAuth({ auth: null, hasCredential: false, exporter })).not.toThrow();
    });

    it('rejects a credential without authentication', () => {
      expect(() => validateOtlpAuth({ auth: undefined, hasCredential: true, exporter })).toThrow(
        'secrets.auth.credential can only be set together with auth'
      );
    });

    it('rejects an authentication without a credential', () => {
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'auth_header', scheme: 'api_key' },
          hasCredential: false,
          exporter,
        })
      ).toThrow('secrets.auth.credential is required when auth is set');
    });

    it('rejects an authentication for the managed OTLP endpoint', () => {
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'auth_header', scheme: 'api_key' },
          hasCredential: true,
          exporter: { endpoint: 'managed.ingest.elastic.cloud:443', protocol: 'grpc' },
        })
      ).toThrow('auth cannot be set for an output that sends data to the managed OTLP endpoint');
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'auth_header', scheme: 'api_key' },
          hasCredential: true,
          exporter: {
            ...exporter,
            traces_endpoint: 'https://managed.ingest.elastic.cloud/v1/traces',
          },
        })
      ).toThrow('auth cannot be set for an output that sends data to the managed OTLP endpoint');
    });

    it('rejects a custom header that gRPC cannot send as metadata', () => {
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'custom_header', name: 'x-api+key' },
          hasCredential: true,
          exporter: { endpoint: 'collector.example.com:4317', protocol: 'grpc' },
        })
      ).toThrow('auth.name "x-api+key" cannot be sent as gRPC metadata');
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'custom_header', name: 'x-api+key' },
          hasCredential: true,
          exporter,
        })
      ).not.toThrow();
    });

    it('rejects a header that the authentication sets, whatever its case', () => {
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'auth_header', scheme: 'bearer_token' },
          hasCredential: true,
          exporter: { ...exporter, headers: { authorization: 'Basic abc' } },
        })
      ).toThrow(
        'otlp_exporter.headers cannot contain the "authorization" header, it is set by auth'
      );
      expect(() =>
        validateOtlpAuth({
          auth: { type: 'custom_header', name: 'X-Api-Key' },
          hasCredential: true,
          exporter: { ...exporter, headers: { 'x-api-key': 'value' } },
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
