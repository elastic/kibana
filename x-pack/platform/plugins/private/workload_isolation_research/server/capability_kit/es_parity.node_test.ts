/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import moment from 'moment';
import { asSpaceId } from '@kbn/core-spaces-common';
import { ByteSizeValue } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import {
  AgentManager,
  ClusterClient,
  getRequestHandlerFactory,
  captureResearchEsCapability,
} from '@kbn/core-elasticsearch-client-server-internal';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ModuleRegistry } from './registry';
import { ExecutionHost } from './host';
import { bindSavedObjects } from './services';
import type { CodecInput } from './codecs';

const noop = (): void => {};
const logger: Logger = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  log: noop,
  get: () => logger,
  isLevelEnabled: () => false,
};

for (const transport of ['thread', 'process'] as const) {
  void test(
    transport + ': actual Core transport task headers/CPS/opaqueId/output parity and 401',
    { timeout: 30000 },
    async () => {
      const original = process.env.KBN_RESEARCH_CAPABILITY_KIT;
      process.env.KBN_RESEARCH_CAPABILITY_KIT = 'true';
      let revoked = false;
      const observed: Array<{ authorization?: string; opaque?: string; body: string }> = [];
      const server = createServer(async (request, response) => {
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        observed.push({
          authorization: request.headers.authorization,
          opaque: String(request.headers['x-opaque-id']),
          body: Buffer.concat(chunks).toString('utf8'),
        });
        response.setHeader('x-elastic-product', 'Elasticsearch');
        response.setHeader('content-type', 'application/json');
        response.statusCode = revoked ? 401 : 200;
        response.end(
          JSON.stringify(
            revoked
              ? {
                  error: { type: 'security_exception', reason: 'fixture key revoked' },
                  status: 401,
                }
              : {
                  took: 0,
                  hits: {
                    total: { value: 1, relation: 'eq' },
                    hits: [{ _id: 'one', _source: { value: 'fixture' } }],
                  },
                }
          )
        );
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      const config: ElasticsearchClientConfig = {
        sniffOnStart: false,
        sniffOnConnectionFault: false,
        sniffInterval: false,
        maxSockets: 100,
        maxIdleSockets: 10,
        idleSocketTimeout: moment.duration(30, 's'),
        compression: false,
        requestHeadersWhitelist: ['authorization'],
        customHeaders: {},
        hosts: ['http://127.0.0.1:' + address.port],
        dnsCacheTtl: moment.duration(0),
        maxResponseSize: new ByteSizeValue(1024 * 1024),
        requestTimeout: moment.duration(5, 's'),
      };
      const cluster = new ClusterClient({
        config,
        logger,
        type: 'fixture',
        kibanaVersion: '9.5.0',
        agentFactoryProvider: new AgentManager(logger, { dnsCacheTtlInSeconds: 0 }),
        getExecutionContext: () => 'task:fixture:space-a',
        onRequestHandlerFactory: getRequestHandlerFactory(true, false),
      });
      const request = {
        headers: { authorization: 'ApiKey fixture-not-a-real-secret' },
        spaceId: asSpaceId('space-a'),
      };
      const specifier = require.resolve('./example_tasks');
      const registry = new ModuleRegistry(new Set([specifier]));
      registry.register('services', specifier, 'services');
      const host = new ExecutionHost(registry, { transport });
      const run = () =>
        host.run({
          workloadClass: 'fixture',
          moduleId: 'services',
          input: { es: true },
          principal: 'alice',
          space: 'space-a',
          capabilities: {},
          deadlineMs: 15000,
          data: {
            elasticsearch: captureResearchEsCapability(cluster, request, 'current', {
              projectRouting: 'space',
            }),
          },
        });
      try {
        const main = await cluster
          .asScoped(request, { projectRouting: 'space' })
          .asCurrentUser.search({ index: 'fixture', query: { match_all: {} } });
        const isolated = await run();
        assert.equal(isolated.status, 'success');
        if (isolated.status === 'success') assert.deepEqual(isolated.value, main);
        assert.equal(observed.length, 2);
        assert.ok(observed[0].authorization === observed[1].authorization, 'auth parity');
        assert.ok(observed[0].opaque === observed[1].opaque, 'opaque ID parity');
        assert.ok(observed[0].body === observed[1].body, 'CPS/body parity');
        assert.ok(observed[0].body.includes('space-a'), 'space NPRE injected');
        revoked = true;
        const rejected = await run();
        assert.equal(rejected.status, 'failure');
      } finally {
        await host.stop();
        await cluster.close();
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        );
        if (original === undefined) delete process.env.KBN_RESEARCH_CAPABILITY_KIT;
        else process.env.KBN_RESEARCH_CAPABILITY_KIT = original;
      }
    }
  );

  void test(
    transport + ': scoped SO bridge rejects space override and mismatched principal',
    { timeout: 30000 },
    async () => {
      const specifier = require.resolve('./example_tasks');
      const registry = new ModuleRegistry(new Set([specifier]));
      registry.register('services', specifier, 'services');
      let calls = 0;
      const client = {
        get: async () => {
          calls++;
          return { id: 'one', type: 'fixture', references: [], attributes: { value: 'fixture' } };
        },
      };
      // Minimal fixture only; live Core SO wrapper parity is a separate integration gate.
      const binding = bindSavedObjects(
        client as Pick<SavedObjectsClientContract, 'get'> as SavedObjectsClientContract,
        { principal: 'alice', space: 'space-a' }
      );
      const host = new ExecutionHost(registry, { transport });
      const run = (input: CodecInput, principal = 'alice') =>
        host.run({
          workloadClass: 'fixture',
          moduleId: 'services',
          input,
          principal,
          space: 'space-a',
          deadlineMs: 10000,
          capabilities: { savedObjects: binding },
        });
      try {
        assert.equal((await run({})).status, 'success');
        assert.equal((await run({ namespace: 'space-b' })).status, 'failure');
        assert.equal((await run({}, 'bob')).status, 'failure');
        assert.equal(calls, 1);
      } finally {
        await host.stop();
      }
    }
  );
}
