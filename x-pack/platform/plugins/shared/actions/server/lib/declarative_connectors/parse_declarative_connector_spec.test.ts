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
    - alerting
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

  it('throws when a request sets both url and baseUrl', () => {
    const raw = minimalSpec(`      method: GET
      url: https://example.com
      baseUrl: https://example.com
      path: /ping`);

    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(DeclarativeConnectorSpecError);
    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(/url or baseUrl/);
  });

  it.each(['ears', 'oauth_authorization_code', 'relay', 'not_a_type'])(
    'rejects unsupported auth type %s',
    (authTypeId) => {
      const raw = minimalSpec(`      method: GET
      url: https://example.com`).replace('    - none', `    - ${authTypeId}`);

      expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(DeclarativeConnectorSpecError);
      expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(new RegExp(authTypeId));
    }
  );

  it.each(['basic', 'bearer', 'none'])('accepts shared auth type %s', (authTypeId) => {
    const raw = minimalSpec(`      method: GET
      url: https://example.com`).replace('    - none', `    - ${authTypeId}`);
    const parsed = parseDeclarativeConnectorSpec(raw);

    expect(parsed.auth.types[0]).toEqual({ type: authTypeId, defaults: {} });
  });

  it('rejects okta because auth.prefix is not supported', () => {
    expect(() => parseDeclarativeConnectorSpec(loadFixture('okta-1.0.0.yaml'))).toThrow(
      /auth\.prefix is not supported/
    );
  });

  it('normalizes legacy auth without a prefix', () => {
    const raw = minimalSpec(`      method: GET
      url: https://example.com`).replace(
      `auth:
  types:
    - none`,
      `auth:
  type: api_key_header
  header: Key`
    );
    const parsed = parseDeclarativeConnectorSpec(raw);

    expect(parsed.auth.types).toEqual([
      { type: 'api_key_header', defaults: { headerField: 'Key' } },
    ]);
  });

  it('rejects generativeAIForSearchPlayground', () => {
    const raw = minimalSpec(`      method: GET
      url: https://example.com`).replace('    - alerting', '    - generativeAIForSearchPlayground');

    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(DeclarativeConnectorSpecError);
    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(/generativeAIForSearchPlayground/);
  });

  it('rejects a secrets template and names the action', () => {
    const raw = minimalSpec(`      method: GET
      url: https://example.com
      headers:
        Authorization: "Bearer {{ secrets.apiKey }}"`);

    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(/Action "ping"/);
    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(/secrets\.apiKey/);
  });

  it('rejects an unsafe template path segment', () => {
    const raw = minimalSpec(`      method: GET
      url: "https://example.com/{{ input.__proto__.x }}"`);

    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(/__proto__/);
    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(/Action "ping"/);
  });

  it('rejects a template root other than input or config', () => {
    const raw = minimalSpec(`      method: GET
      url: "https://example.com/{{ foo.bar }}"`);

    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(/foo\.bar/);
    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(/Action "ping"/);
  });
});
