/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatOpenApi, parseOpenApi } from './parse_openapi';

const document = `openapi: 3.0.3
info:
  title: Acme API
  version: 1.0.0
  description: Talks to Acme
servers:
  - url: https://api.acme.com/v1
security:
  - bearerAuth: []
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  schemas:
    Message:
      type: object
      required: [message]
      properties:
        message:
          type: string
paths:
  /items/{itemId}:
    get:
      operationId: getItem
      summary: Get an item
      parameters:
        - name: itemId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: OK
  /messages:
    post:
      operationId: sendMessage
      summary: Send a message
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Message'
      responses:
        '200':
          description: OK
`;

describe('parseOpenApi', () => {
  it('converts YAML operations, path input, a JSON body, and bearer auth', () => {
    const { connectorType, skippedOperations } = parseOpenApi(document);

    expect(skippedOperations).toEqual([]);
    expect(connectorType).toMatchObject({
      id: 'acme-api',
      displayName: 'Acme API',
      description: 'Talks to Acme',
      auth: { type: 'bearer' },
      config: [{ name: 'baseUrl', default: 'https://api.acme.com/v1' }],
      actions: {
        getItem: {
          scope: 'read',
          input: [{ name: 'itemId', type: 'string', required: true }],
          request: {
            method: 'GET',
            url: '{{config.baseUrl}}',
            path: '/items/{{input.itemId}}',
          },
        },
        sendMessage: {
          scope: 'write',
          input: [{ name: 'message', type: 'string', required: true }],
          request: {
            method: 'POST',
            path: '/messages',
            headers: { 'Content-Type': 'application/json' },
            body: { message: '{{input.message}}' },
          },
        },
      },
    });
  });

  it('accepts JSON and formats it as YAML', () => {
    const parsed = parseOpenApi(document);
    const json = JSON.stringify({
      openapi: '3.0.3',
      info: { title: 'Simple API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: { '/ping': { get: { responses: { 200: { description: 'OK' } } } } },
    });
    expect(parseOpenApi(json).connectorType.actions).toHaveProperty('get_ping');
    expect(formatOpenApi(json)).toContain('openapi: 3.0.3');
    expect(parsed.connectorType.actions).toHaveProperty('getItem');
  });

  it('reports unsupported operations while importing supported ones', () => {
    const yaml = document.replace(
      '  /messages:\n',
      `  /search:\n    get:\n      parameters:\n        - name: q\n          in: query\n          schema:\n            type: string\n      responses:\n        '200':\n          description: OK\n  /messages:\n`
    );
    const result = parseOpenApi(yaml);
    expect(result.skippedOperations).toEqual([
      'GET /search: Optional query parameter "q" is not supported.',
    ]);
    expect(Object.keys(result.connectorType.actions)).toEqual(['getItem', 'sendMessage']);
  });

  it('imports required scalar query parameters into the request URL', () => {
    const yaml = document.replace(
      '  /messages:\n',
      `  /search:\n    get:\n      operationId: search\n      parameters:\n        - name: q\n          in: query\n          required: true\n          schema:\n            type: string\n      responses:\n        '200':\n          description: OK\n  /messages:\n`
    );
    expect(parseOpenApi(yaml).connectorType.actions.search).toMatchObject({
      input: [{ name: 'q', required: true }],
      request: { method: 'GET', url: '{{config.baseUrl}}/search?q={{input.q}}' },
    });
  });

  it('does not import an operation that overrides the document server', () => {
    const yaml = document.replace(
      '      operationId: getItem',
      '      servers:\n        - url: https://other.example.com\n      operationId: getItem'
    );
    const result = parseOpenApi(yaml);
    expect(result.skippedOperations).toEqual([
      'GET /items/{itemId}: Operation and path server overrides are not supported.',
    ]);
    expect(result.connectorType.actions).toHaveProperty('sendMessage');
  });

  it('uses an operation parameter in place of the same path parameter', () => {
    const yaml = document.replace(
      '  /items/{itemId}:\n    get:',
      `  /items/{itemId}:\n    parameters:\n      - name: itemId\n        in: path\n        required: true\n        schema:\n          type: number\n    get:`
    );
    const result = parseOpenApi(yaml);
    expect(result.skippedOperations).toEqual([]);
    expect(result.connectorType.actions.getItem.input).toEqual([
      expect.objectContaining({ name: 'itemId', type: 'string' }),
    ]);
  });

  it('rejects documents that cannot produce a valid connector draft', () => {
    expect(() => parseOpenApi('id: acme\nactions: {}')).toThrow('Enter an OpenAPI');
    expect(() => parseOpenApi(document.replace('https://api.acme.com/v1', '/v1'))).toThrow(
      'absolute HTTP or HTTPS URL'
    );
    expect(
      parseOpenApi(
        document.replace("$ref: '#/components/schemas/Message'", "$ref: 'other.yaml#/Message'")
      ).skippedOperations
    ).toEqual(['POST /messages: Unsupported or circular reference: other.yaml#/Message']);
  });
});
