/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRecordingAxiosClient } from '@kbn/connector-specs/src/lib/recording_axios_client';
import { loadFixture } from './__fixtures__/load_fixture';
import { executeDeclarativeRequest } from './execute_declarative_request';
import { parseDeclarativeConnectorSpec } from './parse_declarative_connector_spec';
import { TemplateRenderError } from './render_template';

describe('executeDeclarativeRequest', () => {
  const connector = parseDeclarativeConnectorSpec(loadFixture('abuseipdb-1.1.0.yaml'));
  const config = { baseUrl: 'https://api.abuseipdb.com' };

  it('sends checkIp as a GET with templated base URL, path, and query', async () => {
    const { client, requests } = createRecordingAxiosClient({}, () => ({
      data: { data: { score: 1 } },
      status: 200,
      headers: {},
    }));
    const requestSpy = jest.spyOn(client, 'request');

    await executeDeclarativeRequest({
      client,
      request: connector.actions.checkIp.request,
      input: { ipAddress: '1.2.3.4', maxAgeInDays: 90, verbose: false },
      config,
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]).toEqual(
      expect.objectContaining({
        method: 'get',
        url: 'https://api.abuseipdb.com/api/v2/check',
      })
    );
    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://api.abuseipdb.com/api/v2/check',
        params: {
          ipAddress: '1.2.3.4',
          maxAgeInDays: 90,
          verbose: false,
        },
      })
    );
    expect(requestSpy.mock.calls[0][0]?.params).not.toHaveProperty('someOtherParam');
  });

  it('sends reportIp as URLSearchParams and keeps JSON as the default body', async () => {
    const { client } = createRecordingAxiosClient({});
    const requestSpy = jest.spyOn(client, 'request');

    await executeDeclarativeRequest({
      client,
      request: connector.actions.reportIp.request,
      input: { ip: '1.2.3.4', categories: [18, 22], comment: 'spam' },
      config,
    });

    const formBody = requestSpy.mock.calls[0][0]?.data as URLSearchParams;
    expect(formBody).toBeInstanceOf(URLSearchParams);
    expect(formBody.get('ip')).toBe('1.2.3.4');
    expect(formBody.get('categories')).toBe('18,22');
    expect(formBody.get('comment')).toBe('spam');
    expect(requestSpy.mock.calls[0][0]?.headers).toEqual(
      expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' })
    );

    await executeDeclarativeRequest({
      client,
      request: {
        method: 'POST',
        url: 'https://api.example/json',
        body: { note: '{{ input.note }}' },
      },
      input: { note: 'hello' },
      config: {},
    });
    expect(requestSpy.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        data: { note: 'hello' },
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('keeps number and boolean types in a JSON body', async () => {
    const { client } = createRecordingAxiosClient({});
    const requestSpy = jest.spyOn(client, 'request');

    await executeDeclarativeRequest({
      client,
      request: {
        method: 'POST',
        url: 'https://api.example/items',
        body: {
          page: '{{ input.page }}',
          perPage: '{{ input.perPage }}',
          includeArchived: '{{ input.includeArchived }}',
          label: 'page {{ input.page }}',
        },
      },
      input: { page: 2, perPage: 50, includeArchived: false },
      config: {},
    });

    const sent = requestSpy.mock.calls[0][0];
    expect(sent?.data).toEqual({ page: 2, perPage: 50, includeArchived: false, label: 'page 2' });
    expect(sent?.headers).not.toEqual(
      expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' })
    );
  });

  it('sends a text body as a string', async () => {
    const { client } = createRecordingAxiosClient({});
    const requestSpy = jest.spyOn(client, 'request');

    await executeDeclarativeRequest({
      client,
      request: {
        method: 'POST',
        url: 'https://api.example/text',
        bodyType: 'text',
        body: 'hello {{ input.name }}',
      },
      input: { name: 'ada' },
      config: {},
    });

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: 'hello ada',
        headers: expect.objectContaining({ 'Content-Type': 'text/plain' }),
      })
    );
  });

  it('returns object response data as-is and wraps non-object data', async () => {
    const request = { method: 'GET' as const, url: 'https://api.example/raw' };
    const objectClient = createRecordingAxiosClient({}, () => ({
      data: { score: 1 },
      status: 200,
      headers: {},
    }));
    await expect(
      executeDeclarativeRequest({
        client: objectClient.client,
        request,
        input: {},
        config: {},
      })
    ).resolves.toEqual({ score: 1 });

    const scalarClient = createRecordingAxiosClient({}, () => ({
      data: 'ok',
      status: 200,
      headers: {},
    }));
    await expect(
      executeDeclarativeRequest({
        client: scalarClient.client,
        request,
        input: {},
        config: {},
      })
    ).resolves.toEqual({ data: 'ok' });
  });

  it('does not send a request when rendering or the URL fails', async () => {
    const { client, requests } = createRecordingAxiosClient({});

    await expect(
      executeDeclarativeRequest({
        client,
        request: { method: 'GET', url: 'https://example.com/{{ input.missing }}' },
        input: {},
        config: {},
      })
    ).rejects.toThrow(TemplateRenderError);
    await expect(
      executeDeclarativeRequest({
        client,
        request: { method: 'GET', url: '{{ input.__proto__.x }}' },
        input: {},
        config: {},
      })
    ).rejects.toThrow(/cannot control the URL origin/);
    await expect(
      executeDeclarativeRequest({
        client,
        request: { method: 'GET', baseUrl: 'ftp://x', path: '/check' },
        input: {},
        config: {},
      })
    ).rejects.toThrow(/ftp:/);
    await expect(
      executeDeclarativeRequest({
        client,
        request: { method: 'GET', baseUrl: 'not a url', path: '/check' },
        input: {},
        config: {},
      })
    ).rejects.toThrow(/not valid/);
    await expect(
      executeDeclarativeRequest({
        client,
        request: { method: 'GET', url: 'https://{{ input.host }}/check' },
        input: { host: 'attacker.example' },
        config: {},
      })
    ).rejects.toThrow(/cannot control the URL origin/);
    for (const url of [
      'https://api.{{ input.host }}.example/check',
      'https://api.example@{{ input.host }}/check',
      'https://{{ input.host }}.example@api.example/check',
    ]) {
      await expect(
        executeDeclarativeRequest({
          client,
          request: { method: 'GET', url },
          input: { host: 'attacker.example' },
          config: {},
        })
      ).rejects.toThrow(/cannot control the URL origin/);
    }
    await expect(
      executeDeclarativeRequest({
        client,
        request: { method: 'GET', baseUrl: '{{ input.host }}', path: '/check' },
        input: { host: 'https://attacker.example' },
        config: {},
      })
    ).rejects.toThrow(/exact config.baseUrl/);

    expect(requests).toHaveLength(0);
  });

  it('fails on missing exact templates and omits only explicitly optional object values', async () => {
    const { client } = createRecordingAxiosClient({});
    const requestSpy = jest.spyOn(client, 'request');

    await expect(
      executeDeclarativeRequest({
        client,
        request: {
          method: 'POST',
          url: 'https://api.example/items',
          query: { typo: '{{ input.typo }}' },
        },
        input: {},
        config: {},
      })
    ).rejects.toThrow(/input.typo.*did not resolve/);
    expect(requestSpy).not.toHaveBeenCalled();

    await executeDeclarativeRequest({
      client,
      request: {
        method: 'POST',
        url: 'https://api.example/items',
        query: { optional: '{{ input.optional? }}', present: '{{ input.present }}' },
        headers: { 'X-Optional': '{{ input.optional? }}' },
        body: { optional: '{{ input.optional? }}', present: '{{ input.present }}' },
      },
      input: { present: 'yes' },
      config: {},
    });

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        params: { present: 'yes' },
        headers: expect.not.objectContaining({ 'X-Optional': expect.anything() }),
        data: { present: 'yes' },
      })
    );
  });

  it('encodes URL template values as one path segment', async () => {
    const { client } = createRecordingAxiosClient({}, () => ({
      data: {},
      status: 200,
      headers: {},
    }));
    const requestSpy = jest.spyOn(client, 'request');
    const input = { id: 'a/b?next=yes#section' };

    await executeDeclarativeRequest({
      client,
      request: { method: 'GET', url: 'https://api.example/items/{{ input.id }}' },
      input,
      config: {},
    });
    await executeDeclarativeRequest({
      client,
      request: { method: 'GET', baseUrl: 'https://api.example', path: '/items/{{ input.id }}' },
      input,
      config: {},
    });
    await executeDeclarativeRequest({
      client,
      request: { method: 'GET', url: '{{ config.baseUrl }}/items/{{ input.id }}' },
      input,
      config: { baseUrl: 'https://api.example' },
    });

    expect(requestSpy).toHaveBeenCalledTimes(3);
    for (const [request] of requestSpy.mock.calls) {
      expect(request.url).toBe('https://api.example/items/a%2Fb%3Fnext%3Dyes%23section');
    }
  });

  it('rejects optional templates embedded in strings', async () => {
    const { client, requests } = createRecordingAxiosClient({});
    await expect(
      executeDeclarativeRequest({
        client,
        request: {
          method: 'POST',
          url: 'https://api.example/items',
          body: { label: 'prefix {{ input.label? }}' },
        },
        input: {},
        config: {},
      })
    ).rejects.toThrow(/only supported as exact object values/);
    await expect(
      executeDeclarativeRequest({
        client,
        request: { method: 'POST', url: 'https://api.example/items', body: '{{ input.body? }}' },
        input: {},
        config: {},
      })
    ).rejects.toThrow(/only supported as exact object values/);
    await expect(
      executeDeclarativeRequest({
        client,
        request: {
          method: 'GET',
          url: 'https://api.example/items/{{ input.id? }}',
        },
        input: {},
        config: {},
      })
    ).rejects.toThrow(/Optional templates are not supported in URLs/);
    expect(requests).toHaveLength(0);
  });

  it('rejects dot path segments before sending a request', async () => {
    const { client, requests } = createRecordingAxiosClient({});
    await expect(
      executeDeclarativeRequest({
        client,
        request: { method: 'GET', url: 'https://api.example/items/{{ input.id }}' },
        input: { id: '..' },
        config: {},
      })
    ).rejects.toThrow(TemplateRenderError);
    expect(requests).toHaveLength(0);
  });
});
