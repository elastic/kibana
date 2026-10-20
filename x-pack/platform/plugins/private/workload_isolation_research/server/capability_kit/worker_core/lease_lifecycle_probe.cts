/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Real T7aController.createStub + real TaskManagerRunner.
 * Collateral after execution_start must persist a refunded attempt and reschedule.
 * Run: node .../lease_lifecycle_probe.cts */

require('@kbn/setup-node-env');

const assert = require('node:assert/strict');
const moment = require('moment');
const { Agent } = require('http');
const {
  ClusterClient,
  getRequestHandlerFactory,
} = require('@kbn/core-elasticsearch-client-server-internal');
const { ExecutionHost } = require('../host');
const { T7aController } = require('../../t7a/main_host');
const { TaskManagerRunner } = require('../../../../../../../platform/plugins/shared/task_manager/server/task_running/task_runner');
const {
  markResearchExecutionStarted,
  resetResearchExecutionClasses,
  setResearchTaskDefinitionSource,
  clearResearchLease,
} = require('../../../../../../../platform/plugins/shared/task_manager/server/lib/research_runner_override');

const TYPE = 'alerting:.es-query';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const duration = (ms) => moment.duration(ms, 'ms');

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
  process.env.KBN_RESEARCH_CAPABILITY_KIT = 'true';
  globalThis[Symbol.for('kbn.research.config.atPathSync')] = () => ({});
  const id = `lease-life-${Date.now().toString(36)}`;
  const es = new ClusterClient({
    config: {
      customHeaders: {},
      requestHeadersWhitelist: [],
      maxSockets: 2,
      maxIdleSockets: 2,
      idleSocketTimeout: duration(1000),
      compression: false,
      sniffOnStart: false,
      sniffOnConnectionFault: false,
      sniffInterval: false,
      hosts: ['http://127.0.0.1:9'],
      dnsCacheTtl: duration(0),
      requestTimeout: duration(1000),
    },
    logger,
    type: 'worker-core-lease',
    agentFactoryProvider: { getAgentFactory: () => () => new Agent({ keepAlive: false }) },
    kibanaVersion: '9.6.0',
    onRequestHandlerFactory: getRequestHandlerFactory(false, false),
  });
  setResearchTaskDefinitionSource({
    get: (type) =>
      type === TYPE ? { type, timeout: '1s', stateSchemaByVersion: { 1: {} } } : undefined,
  });
  const core = {
    elasticsearch: { client: es },
    featureFlags: {
      getBooleanValue$: () => ({ subscribe() {} }),
    },
    http: { basePath: { serverBasePath: '', publicBaseUrl: undefined } },
    savedObjects: {
      getAllIndices: () => [],
      getDefaultIndex: () => '.kibana',
    },
    security: { authc: { apiKeys: {} } },
    pricing: { isFeatureAvailable: () => false },
    analytics: { reportEvent() {} },
    uiSettings: { asScopedToClient: () => ({}) },
  };
  const controller = new T7aController(
    { core, taskManager: {} },
    {
      instanceUuid: 'lease-life',
      packageInfo: { dist: false, version: '9.6.0', buildFlavor: 'traditional', buildNum: 1, buildSha: 'probe' },
      mode: { dev: true },
    },
    logger,
    { elasticsearch: 'available', savedObjects: 'available', overall: 'available', generation: 1 }
  );
  await controller.configure({ mode: 'offmain' });

  let task = {
    id,
    taskType: TYPE,
    schedule: { interval: '1s' },
    params: {},
    state: {},
    attempts: 1,
    status: 'running',
    runAt: new Date(),
    scheduledAt: new Date(),
    startedAt: new Date(),
    retryAt: new Date(Date.now() + 60_000),
    ownerId: 'probe',
    version: '1:1',
  };
  const writes = [];
  const store = {
    taskManagerId: 'probe',
    async partialUpdate(partial) {
      writes.push({ ...partial });
      task = {
        ...task,
        ...partial,
        version: `${Number(String(task.version).split(':')[0]) + 1}:1`,
      };
      return { ...task };
    },
    async get() {
      return { ...task };
    },
    async remove() {
      task = { ...task, status: 'dead' };
    },
    async update(doc) {
      return this.partialUpdate(doc);
    },
  };
  const original = ExecutionHost.prototype.run;
  let entered = false;
  ExecutionHost.prototype.run = async function run() {
    entered = true;
    await sleep(1100);
    markResearchExecutionStarted(id, Date.now());
    return { status: 'terminated', reason: 'cancelled', collateral: true, graceful: false };
  };
  try {
    const runner = new TaskManagerRunner({
      logger,
      instance: { ...task },
      store,
      definitions: new Map([
        [
          TYPE,
          {
            type: TYPE,
            title: TYPE,
            description: TYPE,
            timeout: '1s',
            maxAttempts: 3,
            createTaskRunner: () => ({ run: async () => ({ state: {} }) }),
          },
        ],
      ]),
      beforeRun: async (context) => context,
      defaultMaxAttempts: 3,
      executionContext: { withContext: (_context, fn) => fn() },
      config: { event_loop_delay: { monitor: false, warn_threshold: 10_000 } },
      allowReadingInvalidState: true,
      getPollInterval: () => 3000,
      apiKeyStrategy: { getApiKeyForFakeRequest: () => undefined },
      eventLogger: { logEvent() {} },
    });
    await runner.markTaskAsRunning();
    await runner.run();
    console.log(
      JSON.stringify({
        entered,
        attempts: task.attempts,
        status: task.status,
        writes,
      })
    );
    assert.equal(task.attempts, 0, 'refunded attempt was not persisted');
    assert.notEqual(task.status, 'running', 'task stayed running after collateral');
  } finally {
    ExecutionHost.prototype.run = original;
    clearResearchLease(id);
    resetResearchExecutionClasses();
    setResearchTaskDefinitionSource(undefined);
    await es.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
