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
    const { client, requests } = createRecordingAxiosClient({});
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

  it('sends reportIp as a JSON body in this phase', async () => {
    const { client } = createRecordingAxiosClient({});
    const requestSpy = jest.spyOn(client, 'request');

    await executeDeclarativeRequest({
      client,
      request: connector.actions.reportIp.request,
      input: { ip: '1.2.3.4', categories: [18, 22], comment: 'spam' },
      config,
    });

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'https://api.abuseipdb.com/api/v2/report',
        data: {
          ip: '1.2.3.4',
          categories: [18, 22],
          comment: 'spam',
        },
      })
    );
  });

  it('returns object response data as-is and wraps non-object data', async () => {
    const objectClient = createRecordingAxiosClient({}, () => ({
      data: { score: 1 },
      status: 200,
      headers: {},
    }));
    await expect(
      executeDeclarativeRequest({
        client: objectClient.client,
        request: connector.actions.checkIp.request,
        input: { ipAddress: '1.2.3.4' },
        config,
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
        request: connector.actions.checkIp.request,
        input: { ipAddress: '1.2.3.4' },
        config,
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
    ).rejects.toThrow(TemplateRenderError);
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

    expect(requests).toHaveLength(0);
  });
});
