/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { materializeDeclarativeConnectorSpec } from './materialize_spec';
import { parseDeclarativeCatalogManifest, parseDeclarativeConnectorSpec } from './parse_spec';
import { ABUSE_IPDB_SPEC_FIXTURE } from './test_fixtures';

describe('declarative connector parsing', () => {
  it('parses and materializes the AbuseIPDB catalog definition', () => {
    const parsed = parseDeclarativeConnectorSpec(ABUSE_IPDB_SPEC_FIXTURE);
    const materialized = materializeDeclarativeConnectorSpec(parsed);

    expect(materialized.metadata.id).toBe('.declarative-abuseipdb');
    expect(materialized.version).toBe('1.0.0');
    expect(parsed.metadata.icon).toEqual({
      path: '1.0.0.svg',
      contentHash: 'sha256:65dc4e2bb86a7b2acccb0fac18449c2e49635004bcb5fbd73e39e6735ce8ac70',
    });
    expect(Object.keys(materialized.actions)).toEqual(['checkIp', 'reportIp']);
    expect(materialized.schema?.parse({})).toEqual({
      baseUrl: 'http://127.0.0.1:8090',
    });
    expect(() => materialized.actions.checkIp.input.parse({ ipAddress: 'not-an-ip' })).toThrow();
  });

  it('accepts any auth type registered by connectors v2', () => {
    const parsed = parseDeclarativeConnectorSpec(
      ABUSE_IPDB_SPEC_FIXTURE.replace(
        `auth:
  types:
    - type: api_key_header
      defaults:
        headerField: Key`,
        `auth:
  types:
    - api_key_query`
      )
    );

    expect(materializeDeclarativeConnectorSpec(parsed).auth?.types).toEqual(['api_key_query']);
  });

  it('normalizes the legacy auth shape for published definitions', () => {
    const parsed = parseDeclarativeConnectorSpec(
      ABUSE_IPDB_SPEC_FIXTURE.replace(
        `auth:
  types:
    - type: api_key_header
      defaults:
        headerField: Key`,
        `auth:
  type: api_key_header
  header: Key`
      )
    );

    expect(materializeDeclarativeConnectorSpec(parsed).auth?.types).toEqual([
      {
        type: 'api_key_header',
        defaults: { headerField: 'Key' },
      },
    ]);
  });

  it('rejects auth types that are not registered in this Kibana version', () => {
    const parsed = parseDeclarativeConnectorSpec(
      ABUSE_IPDB_SPEC_FIXTURE.replace('type: api_key_header', 'type: future_auth_type')
    );

    expect(() => materializeDeclarativeConnectorSpec(parsed)).toThrow(
      'auth type "future_auth_type", which is not registered in this Kibana version'
    );
  });

  it('parses the local catalog manifest', () => {
    const manifest = parseDeclarativeCatalogManifest({
      schemaVersion: 1,
      catalogVersion: '2026-08-23.1',
      activeVersions: {
        '.declarative-abuseipdb': '1.0.0',
        '.declarative-okta': '1.0.0',
      },
      connectors: [
        {
          id: '.declarative-abuseipdb',
          version: '1.0.0',
          definitionUrl: 'connectors/abuseipdb/1.0.0.yaml',
          contentHash: `sha256:${'0'.repeat(64)}`,
        },
        {
          id: '.declarative-okta',
          version: '1.0.0',
          definitionUrl: 'connectors/okta/1.0.0.yaml',
          contentHash: `sha256:${'1'.repeat(64)}`,
        },
      ],
    });

    expect(manifest.catalogVersion).toBe('2026-08-23.1');
    expect(manifest.connectors.map(({ id }) => id)).toEqual([
      '.declarative-abuseipdb',
      '.declarative-okta',
    ]);
  });

  it('rejects executable or unknown fields', () => {
    expect(() =>
      parseDeclarativeConnectorSpec(`
schemaVersion: 1
id: .declarative-test
version: 1.0.0
handler: console.log
`)
    ).toThrow('Declarative connector definition is invalid');
  });

  it('rejects absolute icon URLs', () => {
    expect(() =>
      parseDeclarativeConnectorSpec(
        ABUSE_IPDB_SPEC_FIXTURE.replace('path: 1.0.0.svg', 'path: https://example.com/icon.svg')
      )
    ).toThrow('Asset paths must be relative');
  });

  it('rejects required fields without property definitions', () => {
    expect(() =>
      parseDeclarativeConnectorSpec(
        ABUSE_IPDB_SPEC_FIXTURE.replace('required: [baseUrl]', 'required: [missing]')
      )
    ).toThrow('Required field "missing" has no property definition.');
  });

  it('rejects defaults that do not match their schema type', () => {
    expect(() =>
      parseDeclarativeConnectorSpec(
        ABUSE_IPDB_SPEC_FIXTURE.replace(
          'type: string\n      format: uri\n      default: http://127.0.0.1:8090',
          'type: integer\n      default: http://127.0.0.1:8090'
        )
      )
    ).toThrow('Default value must match type "integer".');
  });

  it('validates defaults against schema constraints', () => {
    const parsed = parseDeclarativeConnectorSpec(
      ABUSE_IPDB_SPEC_FIXTURE.replace('default: http://127.0.0.1:8090', 'default: not-a-valid-url')
    );

    expect(() => materializeDeclarativeConnectorSpec(parsed).schema?.parse({})).toThrow();
  });

  it('rejects type-specific fields on other schema types', () => {
    expect(() =>
      parseDeclarativeConnectorSpec(
        ABUSE_IPDB_SPEC_FIXTURE.replace(
          'type: string\n      format: uri',
          'type: integer\n      minLength: 1'
        ).replace('default: http://127.0.0.1:8090', 'default: 1')
      )
    ).toThrow('"minLength" is only supported for string schemas.');
  });
});
