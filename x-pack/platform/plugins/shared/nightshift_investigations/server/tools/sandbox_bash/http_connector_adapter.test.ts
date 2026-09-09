/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildHttpConnectorParams,
  renderHttpConnectorSection,
  HTTP_CONNECTOR_TYPE_ID,
} from './http_connector_adapter';

const expectParams = (result: ReturnType<typeof buildHttpConnectorParams>) => {
  if ('errorMessage' in result) {
    throw new Error(`expected params, got error: ${result.errorMessage}`);
  }
  return result.params;
};

const expectError = (result: ReturnType<typeof buildHttpConnectorParams>) => {
  if (!('errorMessage' in result)) {
    throw new Error(`expected an error, got params: ${JSON.stringify(result.params)}`);
  }
  return result.errorMessage;
};

describe('buildHttpConnectorParams', () => {
  describe('rejecting url overrides', () => {
    // The connector resolves `params.url || config.url` and attaches the stored
    // credentials to whichever host it ends up with. Accepting `url` from the sandbox
    // would let a prompt-injected agent send those credentials to an arbitrary host.
    it('rejects url outright rather than silently dropping it', () => {
      const message = expectError(
        buildHttpConnectorParams('GET', { url: 'https://attacker.example', path: '/x' })
      );

      expect(message).toContain("'url' cannot be set from the sandbox");
    });

    it('rejects url even when it is null or empty', () => {
      expect(expectError(buildHttpConnectorParams('GET', { url: null }))).toContain("'url'");
      expect(expectError(buildHttpConnectorParams('GET', { url: '' }))).toContain("'url'");
    });

    it('never emits a url key for a valid call', () => {
      const params = expectParams(buildHttpConnectorParams('GET', { path: '/json' }));

      expect(params).not.toHaveProperty('url');
    });
  });

  describe('method resolution', () => {
    it('takes the method from the sub-action and upper-cases it', () => {
      expect(expectParams(buildHttpConnectorParams('get', { path: '/json' }))).toEqual({
        method: 'GET',
        path: '/json',
      });
    });

    it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])('accepts %s', (verb) => {
      expect(expectParams(buildHttpConnectorParams(verb, {})).method).toBe(verb);
    });

    it('lets an explicit method param win over the sub-action', () => {
      const params = expectParams(buildHttpConnectorParams('GET', { method: 'post' }));

      expect(params.method).toBe('POST');
    });

    it('rejects an unknown verb and names the valid ones', () => {
      const message = expectError(buildHttpConnectorParams('FETCH', { path: '/json' }));

      expect(message).toContain('FETCH');
      expect(message).toContain('GET, POST, PUT, PATCH, DELETE');
    });

    it('rejects an empty sub-action when no method param is given', () => {
      expect(expectError(buildHttpConnectorParams('', {}))).toContain('not a valid HTTP method');
    });

    it('falls back to the sub-action when method is a non-string', () => {
      expect(expectParams(buildHttpConnectorParams('GET', { method: 42 })).method).toBe('GET');
    });
  });

  describe('parameter allow-list', () => {
    it('forwards every supported param', () => {
      const params = expectParams(
        buildHttpConnectorParams('POST', {
          path: '/anything',
          query: { a: '1' },
          headers: { 'x-test': 'yes' },
          body: '{"hello":"world"}',
          form_data: { file: { content: 'x', filename: 'x.txt' } },
        })
      );

      expect(params).toEqual({
        method: 'POST',
        path: '/anything',
        query: { a: '1' },
        headers: { 'x-test': 'yes' },
        body: '{"hello":"world"}',
        form_data: { file: { content: 'x', filename: 'x.txt' } },
      });
    });

    it('drops params outside the allow-list', () => {
      const params = expectParams(
        buildHttpConnectorParams('GET', {
          path: '/json',
          fetcher: 'something',
          somethingElse: 'nope',
        })
      );

      expect(params).toEqual({ method: 'GET', path: '/json' });
    });

    it('omits keys that were not supplied rather than sending undefined', () => {
      const params = expectParams(buildHttpConnectorParams('GET', { path: '/json' }));

      expect(Object.keys(params).sort()).toEqual(['method', 'path']);
    });

    it('handles an empty params object', () => {
      expect(expectParams(buildHttpConnectorParams('GET', {}))).toEqual({ method: 'GET' });
    });
  });
});

describe('renderHttpConnectorSection', () => {
  const section = renderHttpConnectorSection('My API', 'abc-123');

  it('identifies the connector and its type', () => {
    expect(section).toContain('## My API (connector-id: abc-123');
    expect(section).toContain(HTTP_CONNECTOR_TYPE_ID);
  });

  it('documents the verb-as-sub-action convention with a usable example', () => {
    expect(section).toContain('--connector-id abc-123 --sub-action GET');
    expect(section).toContain('"path":"/json"');
  });

  it('tells the agent that url is rejected and credentials stay in Kibana', () => {
    expect(section).toContain('Setting `url` is rejected.');
    expect(section).toContain('never exposed here');
  });

  it('does not invite a sub-action probe, which cannot work for this type', () => {
    expect(section).not.toContain('Probe with a test call');
  });
});
