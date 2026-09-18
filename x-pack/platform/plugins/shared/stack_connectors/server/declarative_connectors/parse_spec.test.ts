/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { materializeDeclarativeConnectorSpec } from './materialize_spec';
import { parseDeclarativeCatalogManifest, parseDeclarativeConnectorSpec } from './parse_spec';
import {
  ABUSE_IPDB_SPEC_FIXTURE,
  LIVE_CATALOG_MANIFEST,
  LIVE_OKTA_1_0_0_YAML,
} from './test_fixtures';

describe('declarative connector parsing', () => {
  it('parses and materializes the AbuseIPDB catalog definition', () => {
    const parsed = parseDeclarativeConnectorSpec(ABUSE_IPDB_SPEC_FIXTURE);
    const materialized = materializeDeclarativeConnectorSpec(parsed);

    expect(materialized.metadata.id).toBe('.abuseipdb');
    expect(materialized.metadata.isTechnicalPreview).toBeUndefined();
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

  it('parses and materializes the Okta catalog definition', () => {
    const parsed = parseDeclarativeConnectorSpec(LIVE_OKTA_1_0_0_YAML);
    const materialized = materializeDeclarativeConnectorSpec(parsed);

    expect(materialized.metadata.id).toBe('.okta');
    expect(parsed.metadata.icon).toEqual({
      path: '1.0.0.svg',
      contentHash: 'sha256:61285080a6b979ac58e3a9f3c07ed506ee9075db01bd088bfdeaa1a57bdb9f84',
    });
    expect(Object.keys(materialized.actions)).toEqual(['listUsers', 'getLogs']);
    expect(materialized.schema?.parse({})).toEqual({
      orgUrl: 'http://127.0.0.1:8090',
    });
    expect(materialized.auth?.types).toEqual([
      expect.objectContaining({
        type: 'api_key_header',
        defaults: { headerField: 'Authorization' },
      }),
    ]);
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

  it('rejects unknown feature ids', () => {
    expect(() =>
      parseDeclarativeConnectorSpec(
        ABUSE_IPDB_SPEC_FIXTURE.replace(
          'supportedFeatureIds: [workflows]',
          'supportedFeatureIds: [not-a-feature]'
        )
      )
    ).toThrow('Unknown connector feature id');
  });

  it('rejects config that cannot be converted during materialization', () => {
    const parsed = parseDeclarativeConnectorSpec(
      ABUSE_IPDB_SPEC_FIXTURE.replace(
        'type: string\n      format: uri\n      default: http://127.0.0.1:8090',
        'type: string\n      pattern: "["'
      )
    );

    expect(() => materializeDeclarativeConnectorSpec(parsed)).toThrow(
      'Unsupported JSON Schema at config.properties.baseUrl.'
    );
  });
});

const validManifest = () => JSON.parse(LIVE_CATALOG_MANIFEST) as Record<string, unknown>;

describe('parseDeclarativeCatalogManifest', () => {
  it('parses the live catalog.json bytes', () => {
    const manifest = parseDeclarativeCatalogManifest(validManifest());

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.catalogVersion).toBe(
      'sha256:72f5f754750fbdc435db7567e208a1ebffebe4dff5633f401457fea29d2e8e95'
    );
    expect(manifest.activeVersions).toEqual({
      '.abuseipdb': '1.1.0',
      '.okta': '1.0.0',
    });
    expect(manifest.connectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '.abuseipdb',
          version: '1.1.0',
          definitionUrl: 'connectors/abuseipdb/1.1.0.yaml',
          contentHash: 'sha256:e548e6566772e664d7770415f6be588a22d24608e6821c534835307cef7a06f2',
        }),
        expect.objectContaining({
          id: '.okta',
          version: '1.0.0',
          definitionUrl: 'connectors/okta/1.0.0.yaml',
          contentHash: 'sha256:e6ccf241026f7522068eb86cec5b13e06be9208741b8b7db8df510817a790591',
        }),
      ])
    );
  });

  it('rejects a wrong schemaVersion', () => {
    expect(() => parseDeclarativeCatalogManifest({ ...validManifest(), schemaVersion: 2 })).toThrow(
      'Declarative connector catalog is invalid'
    );
  });

  it('rejects an id that does not match the connector id pattern', () => {
    const manifest = validManifest();
    (manifest.connectors as Array<Record<string, unknown>>)[0].id = 'abuseipdb';

    expect(() => parseDeclarativeCatalogManifest(manifest)).toThrow(
      'Declarative connector catalog is invalid'
    );
  });

  it('rejects a non-semver version', () => {
    const manifest = validManifest();
    (manifest.connectors as Array<Record<string, unknown>>)[0].version = '1.1';

    expect(() => parseDeclarativeCatalogManifest(manifest)).toThrow(
      'Declarative connector catalog is invalid'
    );
  });

  it('rejects a bad contentHash', () => {
    const manifest = validManifest();
    (manifest.connectors as Array<Record<string, unknown>>)[0].contentHash = 'not-a-hash';

    expect(() => parseDeclarativeCatalogManifest(manifest)).toThrow(
      'Declarative connector catalog is invalid'
    );
  });

  it('rejects unknown extra keys', () => {
    expect(() => parseDeclarativeCatalogManifest({ ...validManifest(), unexpected: true })).toThrow(
      'Declarative connector catalog is invalid'
    );
  });

  it('rejects an empty connectors list', () => {
    expect(() => parseDeclarativeCatalogManifest({ ...validManifest(), connectors: [] })).toThrow(
      'Declarative connector catalog is invalid'
    );
  });

  it('rejects empty activeVersions', () => {
    expect(() =>
      parseDeclarativeCatalogManifest({ ...validManifest(), activeVersions: {} })
    ).toThrow('Declarative connector catalog is invalid');
  });
});
