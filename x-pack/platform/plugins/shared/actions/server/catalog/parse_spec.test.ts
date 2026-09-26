/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseCatalogContract } from './parse_spec';
import { ABUSE_IPDB_SPEC_FIXTURE, LIVE_OKTA_1_0_YAML } from './test_fixtures';

describe('parseCatalogContract', () => {
  it('parses the AbuseIPDB catalog definition', () => {
    const parsed = parseCatalogContract(ABUSE_IPDB_SPEC_FIXTURE);
    expect(parsed.id).toBe('.abuseipdb');
    expect(parsed.version).toBe('1.0');
    expect(Object.keys(parsed.actions)).toEqual(['checkIp', 'reportIp']);
  });

  it('parses the Okta catalog definition', () => {
    const parsed = parseCatalogContract(LIVE_OKTA_1_0_YAML);
    expect(parsed.id).toBe('.okta');
    expect(Object.keys(parsed.actions)).toEqual(['listUsers', 'getLogs']);
  });

  it('accepts any auth type registered by connectors v2', () => {
    const parsed = parseCatalogContract(
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
    expect(parsed.auth.types).toEqual(['api_key_query']);
  });

  it('normalizes the legacy auth shape for published definitions', () => {
    const parsed = parseCatalogContract(
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
    expect(parsed.auth.types).toEqual([
      {
        type: 'api_key_header',
        defaults: { headerField: 'Key' },
      },
    ]);
  });

  it('rejects a metadata block', () => {
    expect(() =>
      parseCatalogContract(
        ABUSE_IPDB_SPEC_FIXTURE.replace(
          'version: "1.0"',
          `version: "1.0"
metadata:
  displayName: AbuseIPDB
  description: leaked
  minimumLicense: gold
  supportedFeatureIds: [workflows]`
        )
      )
    ).toThrow('Declarative connector definition is invalid');
  });

  it('rejects executable or unknown fields', () => {
    expect(() =>
      parseCatalogContract(`
schemaVersion: 1
id: .declarative-test
version: 1.0
handler: console.log
`)
    ).toThrow('Declarative connector definition is invalid');
  });

  it('rejects url and baseUrl templates that read from input', () => {
    expect(() =>
      parseCatalogContract(
        ABUSE_IPDB_SPEC_FIXTURE.replace(
          'baseUrl: "{{ config.baseUrl }}"',
          'baseUrl: "{{ input.host }}"'
        )
      )
    ).toThrow('url and baseUrl templates may only reference config.*');
  });
});
