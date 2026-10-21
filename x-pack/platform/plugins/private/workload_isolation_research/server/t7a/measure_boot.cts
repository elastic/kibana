/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Boots the alerting island once and prints boot ES-write and fence summaries.
 * Credentials stay in memory. The JSON result contains methods and paths, never bodies. */

import type { Island } from './isolate/island';

require('@kbn/setup-node-env');

const moment = require('moment');
const { bootIsland } = require('./isolate/island');
const { fenceStats, missStats, runContext } = require('./isolate/bridge');

const password = process.env.ELASTIC_PASSWORD || 'changeme';
const host = process.env.T7P_ES || 'http://127.0.0.1:9281';

const snapshot = {
  kibanaVersion: '9.6.0',
  buildFlavor: 'traditional',
  buildNum: 1,
  buildSha: '0'.repeat(40),
  instanceUuid: 'worker-core-measure',
  dist: false,
  dev: true,
  basePath: { serverBasePath: '' },
  license: {
    uid: 'measure',
    type: 'trial',
    mode: 'trial',
    status: 'active',
    expiryDateInMillis: Date.now() + 86400000,
  },
  allIndices: ['.kibana'],
  defaultIndex: '.kibana',
  locatorIds: ['DISCOVER_APP_LOCATOR'],
  uiamEnabled: false,
  securityEnabled: true,
  useRbacForFakeRequest: true,
  taskManagerIndex: '.kibana_task_manager',
  rawConfig: {},
};

const elasticsearch = {
  version: 1,
  mode: 'internal',
  kibanaVersion: '9.6.0',
  executionContext: 'worker-core-measure',
  routing: { enabled: false, expression: '' },
  config: {
    customHeaders: {},
    requestHeadersWhitelist: ['authorization'],
    maxSockets: 16,
    maxIdleSockets: 16,
    idleSocketTimeout: moment.duration(60, 'seconds'),
    compression: false,
    sniffOnStart: false,
    sniffOnConnectionFault: false,
    sniffInterval: false,
    username: 'elastic',
    password,
    hosts: [host],
    dnsCacheTtl: moment.duration(0, 'seconds'),
    requestTimeout: moment.duration(30, 'seconds'),
  },
};

const context = {
  bundle: { runId: 'measure', principal: 'measure', space: 'default', grants: {} },
  signal: new AbortController().signal,
  async call(capability: string, operation: string, args: { fallback?: unknown }) {
    if (capability === 'replica' && operation === 'featureFlag') return args.fallback;
    if (capability === 'replica' && operation === 'pricing') return true;
    return undefined;
  },
  callSync(capability: string, operation: string, args: { fallback?: unknown }) {
    if (capability === 'replica' && operation === 'featureFlag') return args.fallback;
    if (capability === 'replica' && operation === 'pricing') return true;
    return undefined;
  },
};

runContext
  .run(context, () => bootIsland(snapshot, elasticsearch, false))
  .then((island: Island) => {
    const result = {
      bootMs: island.bootMs,
      esWrites: island.esWrites,
      esWriteRecords: island.esWriteRecords,
      esRecords: island.esRecords,
      registeredSoTypes: island.registeredSoTypes,
      taskTypeCount: island.taskCapture.definitions.size,
      taskTypes: [...island.taskCapture.definitions.keys()].sort(),
      fences: Object.fromEntries(fenceStats),
      misses: Object.fromEntries(missStats),
      eventExclusions: ['usage.collector.fetch', 'usage.collector.register'],
    };
    process.stdout.write(`${JSON.stringify(result)}\n`);
    setTimeout(() => process.exit(0), 1500);
    return island.clusterClient.close();
  })
  .catch((error: unknown) => {
    const text = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${text}\n`);
    process.exit(1);
  });
