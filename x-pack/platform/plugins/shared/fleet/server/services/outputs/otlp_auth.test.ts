/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';

import {
  getOtlpAuthHeaders,
  getOtlpAzureAuthExtension,
  omitRemovedOtlpAuthSettings,
  validateOtlpAuth,
  validateOtlpAuthCredential,
  validateOtlpAuthSecrets,
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

    it('returns nothing for the Azure authentication, the extension sets the header', () => {
      expect(
        getOtlpAuthHeaders(
          { type: 'azure', azure_auth_method: 'service_principal' },
          { id: 'id1' },
          exporter
        )
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

    it('trims the Azure client secret', () => {
      expect(
        withTrimmedOtlpAuthCredential({ secrets: { auth: { azure_client_secret: 'secret\n' } } })
      ).toEqual({ secrets: { auth: { azure_client_secret: 'secret' } } });
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

    describe('Azure', () => {
      const servicePrincipal = {
        type: 'azure' as const,
        azure_auth_method: 'service_principal' as const,
        tenant_id: 'tenant',
        client_id: 'client',
      };
      const managedIdentity = {
        type: 'azure' as const,
        azure_auth_method: 'managed_identity' as const,
      };

      it('accepts a service principal with its client secret', () => {
        expect(() =>
          validateOtlpAuth({
            auth: servicePrincipal,
            hasCredential: false,
            hasAzureClientSecret: true,
            exporter,
          })
        ).not.toThrow();
      });

      it('accepts a managed identity, with or without a client id', () => {
        expect(() =>
          validateOtlpAuth({ auth: managedIdentity, hasCredential: false, exporter })
        ).not.toThrow();
        expect(() =>
          validateOtlpAuth({
            auth: { ...managedIdentity, client_id: 'client', scopes: ['scope'] },
            hasCredential: false,
            exporter,
          })
        ).not.toThrow();
      });

      it('rejects the gRPC protocol', () => {
        expect(() =>
          validateOtlpAuth({
            auth: managedIdentity,
            hasCredential: false,
            exporter: { endpoint: 'collector.example.com:4317', protocol: 'grpc' },
          })
        ).toThrow('auth.type "azure" requires otlp_exporter.protocol "http/protobuf"');
      });

      it('rejects a service principal without its tenant, client id or client secret', () => {
        expect(() =>
          validateOtlpAuth({
            auth: { type: 'azure', azure_auth_method: 'service_principal' },
            hasCredential: false,
            hasAzureClientSecret: true,
            exporter,
          })
        ).toThrow(
          'auth.tenant_id and auth.client_id are required for the service_principal method'
        );
        expect(() =>
          validateOtlpAuth({
            auth: { ...servicePrincipal, client_id: undefined },
            hasCredential: false,
            hasAzureClientSecret: true,
            exporter,
          })
        ).toThrow('auth.client_id is required for the service_principal method');
        expect(() =>
          validateOtlpAuth({ auth: servicePrincipal, hasCredential: false, exporter })
        ).toThrow('secrets.auth.azure_client_secret is required for the service_principal method');
      });

      it('rejects a tenant or a client secret for a managed identity', () => {
        expect(() =>
          validateOtlpAuth({
            auth: { ...managedIdentity, tenant_id: 'tenant' },
            hasCredential: false,
            exporter,
          })
        ).toThrow('auth.tenant_id can only be set for the service_principal method');
        expect(() =>
          validateOtlpAuth({
            auth: managedIdentity,
            hasCredential: false,
            hasAzureClientSecret: true,
            exporter,
          })
        ).toThrow(
          'secrets.auth.azure_client_secret can only be set for the service_principal method of auth.type "azure"'
        );
      });

      it('rejects the credential of the header types', () => {
        expect(() =>
          validateOtlpAuth({
            auth: servicePrincipal,
            hasCredential: true,
            hasAzureClientSecret: true,
            exporter,
          })
        ).toThrow('secrets.auth.credential cannot be set for auth.type "azure"');
      });

      it('rejects a client secret for the header types or without authentication', () => {
        expect(() =>
          validateOtlpAuth({
            auth: { type: 'auth_header', scheme: 'api_key' },
            hasCredential: true,
            hasAzureClientSecret: true,
            exporter,
          })
        ).toThrow('secrets.auth.azure_client_secret can only be set for the service_principal');
        expect(() =>
          validateOtlpAuth({
            auth: null,
            hasCredential: false,
            hasAzureClientSecret: true,
            exporter,
          })
        ).toThrow('secrets.auth.azure_client_secret can only be set together with auth');
      });

      it('rejects the Authorization header, that the extension sets', () => {
        expect(() =>
          validateOtlpAuth({
            auth: managedIdentity,
            hasCredential: false,
            exporter: { ...exporter, headers: { Authorization: 'Basic abc' } },
          })
        ).toThrow(
          'otlp_exporter.headers cannot contain the "Authorization" header, it is set by auth'
        );
      });

      it('rejects the managed OTLP endpoint', () => {
        expect(() =>
          validateOtlpAuth({
            auth: managedIdentity,
            hasCredential: false,
            exporter: {
              endpoint: 'https://managed.ingest.elastic.cloud',
              protocol: 'http/protobuf',
            },
          })
        ).toThrow('auth cannot be set for an output that sends data to the managed OTLP endpoint');
      });
    });
  });

  describe('getOtlpAzureAuthExtension', () => {
    const exporter = {
      endpoint: 'https://collector.example.com:4318',
      protocol: 'http/protobuf' as const,
    };

    it('returns the system-assigned managed identity', () => {
      expect(
        getOtlpAzureAuthExtension(
          { type: 'azure', azure_auth_method: 'managed_identity' },
          undefined,
          exporter
        )
      ).toEqual({ managed_identity: {} });
    });

    it('returns the user-assigned managed identity, with the scopes', () => {
      expect(
        getOtlpAzureAuthExtension(
          {
            type: 'azure',
            azure_auth_method: 'managed_identity',
            client_id: 'client',
            scopes: ['https://monitor.azure.com/.default'],
          },
          undefined,
          exporter
        )
      ).toEqual({
        managed_identity: { client_id: 'client' },
        scopes: ['https://monitor.azure.com/.default'],
      });
    });

    it('returns the service principal with the secret reference of its client secret', () => {
      expect(
        getOtlpAzureAuthExtension(
          {
            type: 'azure',
            azure_auth_method: 'service_principal',
            tenant_id: 'tenant',
            client_id: 'client',
          },
          { id: 'secret-id' },
          exporter
        )
      ).toEqual({
        service_principal: {
          tenant_id: 'tenant',
          client_id: 'client',
          client_secret: '$co.elastic.secret{secret-id}',
        },
      });
    });

    it('returns nothing for a service principal without a stored client secret', () => {
      const auth = {
        type: 'azure' as const,
        azure_auth_method: 'service_principal' as const,
        tenant_id: 'tenant',
        client_id: 'client',
      };
      expect(getOtlpAzureAuthExtension(auth, undefined, exporter)).toBeUndefined();
      // a plain text value is never put in the policy
      expect(getOtlpAzureAuthExtension(auth, 'plain' as any, exporter)).toBeUndefined();
    });

    it('returns nothing for the header types, or for the managed OTLP endpoint', () => {
      expect(
        getOtlpAzureAuthExtension(
          { type: 'auth_header', scheme: 'api_key' },
          { id: 'id1' },
          exporter
        )
      ).toBeUndefined();
      expect(
        getOtlpAzureAuthExtension(
          { type: 'azure', azure_auth_method: 'managed_identity' },
          undefined,
          { endpoint: 'https://managed.ingest.elastic.cloud', protocol: 'http/protobuf' }
        )
      ).toBeUndefined();
    });
  });

  describe('validateOtlpAuthSecrets', () => {
    it('validates the client secret like the credential', () => {
      expect(() =>
        validateOtlpAuthSecrets({ auth: { azure_client_secret: 'my\nsecret' } })
      ).toThrow('secrets.auth.azure_client_secret cannot contain control characters');
      expect(() =>
        validateOtlpAuthSecrets(
          { auth: { azure_client_secret: { id: 'other' } } },
          { auth: { azure_client_secret: { id: 'stored' } } }
        )
      ).toThrow(
        'secrets.auth.azure_client_secret must be a new value, or the reference to the client secret of this output'
      );
      expect(() =>
        validateOtlpAuthSecrets(
          { auth: { azure_client_secret: { id: 'stored' } } },
          { auth: { azure_client_secret: { id: 'stored' } } }
        )
      ).not.toThrow();
    });

    it('does not accept the reference to the credential as the client secret', () => {
      expect(() =>
        validateOtlpAuthSecrets(
          { auth: { azure_client_secret: { id: 'stored' } } },
          { auth: { credential: { id: 'stored' } } }
        )
      ).toThrow('secrets.auth.azure_client_secret must be a new value');
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
