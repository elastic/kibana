/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer } from 'node:http';
import type { Server, IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { PodLogger } from '../logger';
import { createPodCoreContext } from './core_context';
import { createElasticsearchCore } from './es_cluster';

describe('pod Elasticsearch', () => {
  const env = { ...process.env };
  let server: Server;
  let seen: IncomingHttpHeaders[];
  let url: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      seen.push(req.headers);
      res.writeHead(200, {
        'content-type': 'application/json',
        'x-elastic-product': 'Elasticsearch',
      });
      res.end(JSON.stringify({ version: { number: '9.0.0' } }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(() => {
    seen = [];
    delete process.env.ES_API_KEY;
    delete process.env.ES_USERNAME;
    delete process.env.ES_PASSWORD;
    process.env.ES_URL = url;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  const create = (config: Record<string, unknown> = {}) =>
    createElasticsearchCore(
      createPodCoreContext({ config, logger: new PodLogger('test', 'off') }),
      config
    );

  it('requires ES_URL', () => {
    delete process.env.ES_URL;
    expect(() => create()).toThrow('ES_URL is required');
  });

  it('talks as the configured user, defaulting to the elastic superuser', async () => {
    const es = create();
    await es.start.client.asInternalUser.info();
    expect(seen[0].authorization).toBe(
      `Basic ${Buffer.from('elastic:changeme').toString('base64')}`
    );
    process.env.ES_USERNAME = 'kibana_system';
    process.env.ES_PASSWORD = 'secret';
    const other = create();
    await other.start.client.asInternalUser.info();
    expect(seen[1].authorization).toBe(
      `Basic ${Buffer.from('kibana_system:secret').toString('base64')}`
    );
    await Promise.all([es.stop(), other.stop()]);
  });

  it('talks with an API key when ES_API_KEY is set', async () => {
    process.env.ES_API_KEY = 'abc';
    const es = create();
    await es.start.client.asInternalUser.info();
    expect(seen[0].authorization).toBe('ApiKey abc');
    await es.stop();
  });

  it('scopes a fake request to its own credentials', async () => {
    const es = create();
    await es.start.client
      .asScoped({ headers: { authorization: 'ApiKey user-key', 'x-other': 'dropped' } } as never)
      .asCurrentUser.info();
    expect(seen[0].authorization).toBe('ApiKey user-key');
    expect(seen[0]['x-other']).toBeUndefined();
    await es.stop();
  });

  it('applies the elasticsearch section of the pod config and creates custom clients', async () => {
    const es = create({ elasticsearch: { customHeaders: { 'x-team': 'a' } } });
    await es.start.createClient('custom').asInternalUser.info();
    expect(seen[0]['x-team']).toBe('a');
    await es.stop();
  });
});
