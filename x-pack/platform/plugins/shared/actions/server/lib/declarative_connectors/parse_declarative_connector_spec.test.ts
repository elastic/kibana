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
    expect(parsed.config.properties?.baseUrl.xUi?.validate?.allowedHosts).toBe(true);
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

  it.each([
    [
      'url and baseUrl without path',
      '      url: https://example.com\n      baseUrl: https://example.com',
    ],
    ['url and path without baseUrl', '      url: https://example.com\n      path: /ping'],
    ['baseUrl without path', '      baseUrl: https://example.com'],
    ['path without baseUrl', '      path: /ping'],
  ])('rejects a request with %s', (_name, urlFields) => {
    const raw = minimalSpec(`      method: GET\n${urlFields}`);

    expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(
      /Provide either url or baseUrl with path/
    );
  });

  it('accepts a request with only baseUrl and path', () => {
    const raw = minimalSpec(`      method: GET
      baseUrl: https://example.com
      path: /ping`);

    expect(() => parseDeclarativeConnectorSpec(raw)).not.toThrow();
  });

  describe('JSON schema validation', () => {
    const specWithInput = (inputYaml: string): string =>
      minimalSpec(`      method: GET
      url: https://example.com/ping`).replace(
        `    input:
      type: object
      additionalProperties: false
`,
        `    input:\n${inputYaml}\n`
      );

    it.each([
      [
        'required name without a property',
        `      type: object
      required: [missing]
      properties:
        other:
          type: string`,
        /Required field "missing" has no property definition/,
      ],
      [
        'required name with no properties at all',
        `      type: object
      required: [missing]`,
        /Required field "missing" has no property definition/,
      ],
      [
        'properties on a string',
        `      type: string
      properties:
        a:
          type: string`,
        /"properties" is only supported for object schemas/,
      ],
      [
        'required on a string',
        `      type: string
      required: [a]`,
        /"required" is only supported for object schemas/,
      ],
      [
        'items on an object',
        `      type: object
      items:
        type: string`,
        /"items" is only supported for array schemas/,
      ],
      [
        'format on a number',
        `      type: number
      format: uri`,
        /"format" is only supported for string schemas/,
      ],
      [
        'minLength on a number',
        `      type: number
      minLength: 1`,
        /"minLength" is only supported for string schemas/,
      ],
      [
        'maxLength on an integer',
        `      type: integer
      maxLength: 1`,
        /"maxLength" is only supported for string schemas/,
      ],
      [
        'minimum on a string',
        `      type: string
      minimum: 1`,
        /"minimum" is only supported for number or integer schemas/,
      ],
      [
        'maximum on a string',
        `      type: string
      maximum: 1`,
        /"maximum" is only supported for number or integer schemas/,
      ],
      [
        'additionalProperties on a string',
        `      type: string
      additionalProperties: false`,
        /"additionalProperties" is only supported for object schemas/,
      ],
      [
        'string default on a number',
        `      type: number
      default: abc`,
        /Default value must match type "number"/,
      ],
      [
        'non-integer default on an integer',
        `      type: integer
      default: 1.5`,
        /Default value must match type "integer"/,
      ],
      [
        'number default on a string',
        `      type: string
      default: 1`,
        /Default value must match type "string"/,
      ],
      [
        'string enum entry on a number',
        `      type: number
      enum: [1, abc]`,
        /Enum value must match type "number"/,
      ],
      [
        'non-integer enum entry on an integer',
        `      type: integer
      enum: [1, 1.5]`,
        /Enum value must match type "integer"/,
      ],
      [
        'number enum entry on a string',
        `      type: string
      enum: [a, 2]`,
        /Enum value must match type "string"/,
      ],
      [
        'invalid keyword inside nested properties',
        `      type: object
      properties:
        name:
          type: string
          minimum: 1`,
        /properties\.name\.minimum: "minimum" is only supported/,
      ],
      [
        'undefined required inside nested properties',
        `      type: object
      properties:
        child:
          type: object
          required: [missing]`,
        /properties\.child\.required: Required field "missing"/,
      ],
      [
        'wrong default type inside nested properties',
        `      type: object
      properties:
        count:
          type: integer
          default: abc`,
        /properties\.count\.default: Default value must match type "integer"/,
      ],
      [
        'invalid keyword inside items',
        `      type: array
      items:
        type: object
        items:
          type: string`,
        /items\.items: "items" is only supported for array schemas/,
      ],
      [
        'wrong enum type inside items',
        `      type: array
      items:
        type: string
        enum: [a, 2]`,
        /items\.enum\.1: Enum value must match type "string"/,
      ],
      [
        'wrong default type inside items',
        `      type: array
      items:
        type: boolean
        default: yes-please`,
        /items\.default: Default value must match type "boolean"/,
      ],
    ])('rejects %s', (_name, inputYaml, message) => {
      const raw = specWithInput(inputYaml);

      expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(DeclarativeConnectorSpecError);
      expect(() => parseDeclarativeConnectorSpec(raw)).toThrow(message);
    });
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
