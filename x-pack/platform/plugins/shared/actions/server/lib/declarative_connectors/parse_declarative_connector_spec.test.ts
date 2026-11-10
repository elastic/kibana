/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadFixture } from './__fixtures__/load_fixture';
import { parseDeclarativeConnectorSpec } from './parse_declarative_connector_spec';
import { DeclarativeConnectorSpecError } from './types';

const minimalSpec = (requestYaml: string): string => `schemaVersion: 1
id: .declarative-test
version: 1.0.0
metadata:
  displayName: Test
  description: Test connector
  minimumLicense: basic
  supportedFeatureIds:
    - workflows
config:
  type: object
  additionalProperties: false
auth:
  types:
    - none
actions:
  ping:
    input:
      type: object
      additionalProperties: false
    request:
${requestYaml}
test:
  request:
    method: GET
    url: https://example.com/health
`;

describe('parseDeclarativeConnectorSpec', () => {
  it('parses the AbuseIPDB catalog contract', () => {
    const parsed = parseDeclarativeConnectorSpec(loadFixture('abuseipdb-1.1.0.yaml'));

    expect(parsed.id).toBe('.declarative-abuseipdb');
    expect(parsed.version).toBe('1.1.0');
    expect(Object.keys(parsed.actions).sort()).toEqual(['checkIp', 'reportIp']);
    expect(parsed.auth.types[0]).toEqual({
      type: 'api_key_header',
      defaults: { headerField: 'Key' },
      overrides: {
        meta: {
          Key: {
            label: 'API key',
            placeholder: 'local-poc-key',
          },
        },
      },
    });
    expect(parsed.test.request).toEqual(
      expect.objectContaining({
        method: 'GET',
        baseUrl: '{{ config.baseUrl }}',
        path: '/api/v2/check',
      })
    );
  });

  it('throws DeclarativeConnectorSpecError for invalid YAML', () => {
    expect(() => parseDeclarativeConnectorSpec('[')).toThrow(DeclarativeConnectorSpecError);
  });

  it('throws DeclarativeConnectorSpecError for the wrong schemaVersion', () => {
    const raw = loadFixture('abuseipdb-1.1.0.yaml').replace('schemaVersion: 1', 'schemaVersion: 2');

    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(DeclarativeConnectorSpecError);
  });

  it('rejects unsupported feature IDs', () => {
    const raw = minimalSpec(`      method: GET
      url: https://example.com/ping`).replace('- workflows', '- alerting');

    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(DeclarativeConnectorSpecError);
    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(/supportedFeatureIds/);
  });

  it('throws when a request sets both url and baseUrl', () => {
    const raw = minimalSpec(`      method: GET
      url: https://example.com
      baseUrl: https://example.com
      path: /ping`);

    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(DeclarativeConnectorSpecError);
    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(/url or baseUrl/);
  });
});
