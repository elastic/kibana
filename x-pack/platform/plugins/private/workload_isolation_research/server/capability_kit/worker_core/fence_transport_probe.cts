/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Core ClusterClient against a local HTTP fixture.
 * Transport merges requestOptions.querystring over params. Both gets must be denied.
 * Run: node .../fence_transport_probe.cts */

require('@kbn/setup-node-env');

const assert = require('node:assert/strict');
const http = require('node:http');
const moment = require('moment');
const { Agent } = require('http');
const { ClusterClient } = require('@kbn/core-elasticsearch-client-server-internal');
const { createBootEsWriteFence } = require('./es_write_fence');

const duration = (ms: number) => moment.duration(ms, 'ms');

const logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  fatal() {},
  trace() {},
  get() {
    return logger;
  },
  log() {},
  isLevelEnabled() {
    return false;
  },
};

const main = async () => {
  const seen: string[] = [];
  const server = http.createServer(
    (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => {
      seen.push(req.url ?? '');
      res.writeHead(200, {
        'content-type': 'application/json',
        'x-elastic-product': 'Elasticsearch',
      });
      res.end(JSON.stringify({ _index: 'orders', _id: '1', found: true, _source: {} }));
    }
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address == null || typeof address === 'string') {
    throw new Error('fixture did not bind a port');
  }
  const { port } = address;
  const fence = createBootEsWriteFence({ mode: 'deny', allow: [] });
  const client = new ClusterClient({
    config: {
      customHeaders: {},
      requestHeadersWhitelist: [],
      maxSockets: 4,
      maxIdleSockets: 4,
      idleSocketTimeout: duration(1000),
      compression: false,
      sniffOnStart: false,
      sniffOnConnectionFault: false,
      sniffInterval: false,
      hosts: [`http://127.0.0.1:${port}`],
      dnsCacheTtl: duration(0),
      requestTimeout: duration(2000),
    },
    logger,
    type: 'worker-core-fence',
    agentFactoryProvider: { getAgentFactory: () => () => new Agent({ keepAlive: false }) },
    kibanaVersion: '9.6.0',
    onRequestHandlerFactory: fence.wrap(() => () => undefined),
  });
  const calls = [
    () =>
      client.asInternalUser.get({ index: 'orders', id: '1' }, { querystring: { refresh: true } }),
    () =>
      client.asInternalUser.get(
        { index: 'orders', id: '1', refresh: false },
        { querystring: { refresh: true } }
      ),
  ];
  const errors: string[] = [];
  for (const call of calls) {
    try {
      await call();
      errors.push('admitted');
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  console.log(JSON.stringify({ uris: seen, summary: fence.summary(), errors }));
  assert.deepEqual(seen, [], 'refresh=true reached the fixture');
  assert.equal(fence.summary().denied, 2);
  assert.equal(fence.summary().reads, 0);
  await client.close();
  await new Promise((resolve) => server.close(resolve));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
