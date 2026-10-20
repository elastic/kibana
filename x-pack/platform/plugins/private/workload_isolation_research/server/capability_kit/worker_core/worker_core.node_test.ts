/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Worker Core contract tests.
 * Run: node x-pack/platform/plugins/private/workload_isolation_research/server/capability_kit/worker_core/worker_core_probe.cts */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExecutionHost } from '../host';
import { ModuleRegistry } from '../registry';
import {
  consumeCollateralReschedule,
  deriveCancelGraceMs,
  diffDefinitionParity,
  markCollateralLoss,
  registerExecutionClass,
  researchDefinitionMeta,
  resetResearchExecutionClasses,
  resolveCancelGraceMs,
  setResearchTaskDefinitionSource,
  COLLATERAL_RESCHEDULE_CAP,
} from '@kbn/task-manager-plugin/server/lib/research_runner_override';
import {
  ALERTING_BOOT_ES_WRITE_ALLOW,
  NAMED_EVENT_EXCLUSIONS,
  advanceGeneration,
  captureActiveProduct,
  configKeyPaths,
  classifyFlagOverrides,
  createReplicaWaitQueue,
  createBootEsWriteFence,
  createEventForwarder,
  createExecutionContextService,
  createForwardingLogger,
  createPlatformReplica,
  captureEffectivePluginConfig,
  decideTaskManagerCall,
  forwardLogLevel,
  RUN_BRIDGED_TM_METHODS,
  emptyPlatformReplicas,
  fingerprintSavedObjectType,
  hasExplicitNamespace,
  isEsWrite,
  lookupBooleanFlag,
  parseAnalyticsReport,
  registerForwardedEventType,
  routeSavedObject,
  savedObjectCallOptions,
  runInTmPhase,
  runWithExecutionContext,
  toPlainConfig,
  verifyRegistryReadiness,
} from '.';

const registered = ['alert', 'action'];
const baseRoute = {
  localSo: true,
  target: 'scoped' as const,
  types: ['alert'],
  registeredTypes: registered,
  operation: 'get',
  defaultSpace: true,
};

test('elasticsearch write classification treats search as read and bulk as write', () => {
  assert.equal(isEsWrite('GET', '/.kibana/_doc/1'), false);
  assert.equal(isEsWrite('POST', '/logs-*/_search'), false);
  assert.equal(isEsWrite('POST', '/_bulk'), true);
  assert.equal(isEsWrite('POST', '/_index_template/_simulate/.kibana-event-log-template'), false);
  assert.equal(isEsWrite('PUT', '/.kibana_alerting_cases/_doc/1'), true);
  const fence = createBootEsWriteFence({ mode: 'deny', allow: [] });
  const wrapped = fence.wrap(() => () => undefined);
  const handler = wrapped({ logger: {} as never });
  assert.throws(
    () =>
      handler({ scoped: false }, { method: 'PUT', path: '/secret-index/_doc/1' }, {}, {} as never),
    /boot ES write denied/
  );
  assert.equal(fence.summary().denied, 1);
  handler({ scoped: false }, { method: 'POST', path: '/logs/_search' }, {}, {} as never);
  fence.endBoot();
  handler({ scoped: false }, { method: 'POST', path: '/_bulk' }, {}, {} as never);
  assert.equal(fence.summary().writes, 1);
});

test('boot fence anchors endpoint shapes and waits for installers', async () => {
  assert.equal(isEsWrite('POST', '/orders/_update/_simulate'), true);
  assert.equal(isEsWrite('POST', '/_index_template/_simulate_index/orders'), false);
  const fence = createBootEsWriteFence({
    mode: 'deny',
    allow: ALERTING_BOOT_ES_WRITE_ALLOW,
  });
  const handler = fence.wrap(() => () => undefined)({ logger: {} as never });
  let release: () => void = () => undefined;
  const installer = new Promise<void>((resolve) => {
    release = resolve;
  });
  const settled = fence.awaitInstallers([installer]);
  assert.throws(
    () =>
      handler(
        { scoped: false },
        { method: 'POST', path: '/.kibana-event-log-ds/_delete_by_query' },
        {},
        {} as never
      ),
    /boot ES write denied/
  );
  assert.throws(
    () =>
      handler({ scoped: false }, { method: 'POST', path: '/orders/_update/_simulate' }, {}, {} as never),
    /boot ES write denied/
  );
  handler(
    { scoped: false },
    { method: 'POST', path: '/.kibana-event-log-ds/_bulk' },
    {},
    {} as never
  );
  handler(
    { scoped: false },
    {
      method: 'POST',
      path: '/.kibana_locks-000001/_update/alerting%3Aresource-install%3Acommon',
    },
    {},
    {} as never
  );
  assert.throws(
    () =>
      handler(
        { scoped: false },
        { method: 'POST', path: '/.kibana_locks-000001/_delete_by_query' },
        {},
        {} as never
      ),
    /boot ES write denied/
  );
  assert.throws(
    () =>
      handler(
        { scoped: false },
        { method: 'POST', path: '/.kibana_locks-000001/_update' },
        {},
        {} as never
      ),
    /boot ES write denied/
  );
  assert.throws(
    () =>
      handler(
        { scoped: false },
        { method: 'POST', path: '/orders/.kibana_locks-000001/_update/lock-id' },
        {},
        {} as never
      ),
    /boot ES write denied/
  );
  release();
  await settled;
  handler(
    { scoped: false },
    { method: 'POST', path: '/.kibana-event-log-ds/_delete_by_query' },
    {},
    {} as never
  );
  assert.equal(fence.summary().denied, 5);
  assert.equal(fence.summary().writes, 7);
});

test('flag overrides are classified and unknown flags stay absent', () => {
  const classified = classifyFlagOverrides({
    overrides: {
      'workerCore.liveProbe': true,
      'workerCore.label': 'on',
      'workerCore.limit': 3,
      nested: { alsoOn: false },
    },
  });
  assert.equal(classified.booleans['workerCore.liveProbe'], true);
  assert.equal(classified.booleans['nested.alsoOn'], false);
  assert.equal(classified.strings['workerCore.label'], 'on');
  assert.equal(classified.numbers['workerCore.limit'], 3);
  assert.equal(Object.hasOwn(classified.booleans, 'alertingFeature'), false);
  assert.equal(classifyFlagOverrides(undefined).booleans['workerCore.liveProbe'], undefined);
});

test('replicas refresh on generation change and do not invent flag or price defaults', () => {
  const replica = createPlatformReplica(emptyPlatformReplicas());
  assert.equal(lookupBooleanFlag({ booleans: {}, strings: {}, numbers: {} }, 'x'), undefined);
  assert.equal(replica.booleanFlag('alertingFeature'), undefined);
  assert.equal(replica.price('platinum-only'), undefined);
  replica.apply({
    ...emptyPlatformReplicas(),
    featureFlags: {
      generation: 2,
      value: { booleans: { alertingFeature: false }, strings: {}, numbers: {} },
    },
    pricing: {
      generation: 2,
      value: {
        available: { 'platinum-only': false },
        activeProduct: { name: 'basic' },
      },
    },
  });
  assert.equal(replica.booleanFlag('alertingFeature'), false);
  assert.equal(replica.price('platinum-only'), false);
  assert.deepEqual(replica.activeProduct(), { name: 'basic' });
});

test('replica subscriptions and content hashes observe warm owner changes', async () => {
  const replica = createPlatformReplica(emptyPlatformReplicas());
  const flags: boolean[] = [];
  let completed = false;
  const subscription = replica.booleanFlag$('workerCore.liveProbe', false).subscribe({
    next: (value: boolean) => flags.push(value),
    complete: () => {
      completed = true;
    },
  });
  const statuses: string[] = [];
  replica.status$.subscribe((value) => statuses.push(value.overall));
  replica.apply({
    ...emptyPlatformReplicas(),
    featureFlags: {
      generation: 2,
      value: {
        booleans: { 'workerCore.liveProbe': true, 'alerting.other': false },
        strings: {},
        numbers: {},
      },
    },
    license: { generation: 2, value: { type: 'gold' } },
    status: {
      generation: 2,
      value: { elasticsearch: 'available', savedObjects: 'degraded', overall: 'degraded' },
    },
  });
  assert.deepEqual(flags, [false, true]);
  assert.equal(completed, false);
  assert.equal(statuses[statuses.length - 1], 'degraded');
  subscription.unsubscribe();
  const sameIds = [
    { id: 'alerting', privileges: { disabled: false } },
    { id: 'actions', privileges: { disabled: false } },
  ];
  const changedPrivileges = [
    { id: 'alerting', privileges: { disabled: true } },
    { id: 'actions', privileges: { disabled: false } },
  ];
  assert.equal(
    `${sameIds.length}:${sameIds.map((item) => item.id).join(',')}`,
    `${changedPrivileges.length}:${changedPrivileges.map((item) => item.id).join(',')}`
  );
  const first = advanceGeneration('', 1, sameIds);
  const second = advanceGeneration(first.hash, first.generation, changedPrivileges);
  assert.equal(second.generation, 2);
  assert.equal(captureActiveProduct(undefined), null);
  assert.deepEqual(
    captureActiveProduct({ type: 'security', tier: 'complete', product_lines: ['endpoint'] }),
    { type: 'security', tier: 'complete', product_lines: ['endpoint'] }
  );
  const queue = createReplicaWaitQueue();
  let published = '';
  const waiting = queue.wait('license:1|featureFlags:1').then((fingerprint: string) => {
    published = fingerprint;
  });
  queue.publish('license:1|featureFlags:1');
  await Promise.resolve();
  assert.equal(published, '');
  queue.publish('license:2|featureFlags:2');
  await waiting;
  assert.equal(published, 'license:2|featureFlags:2');
});

test('logger and events forward to the sink and redact secret-looking meta', () => {
  const logs: string[] = [];
  const logger = createForwardingLogger('alerting', (record) => logs.push(record.message));
  logger.warn('booting', { encryptionKey: 'super-secret', count: 2 });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].includes('super-secret'), false);
  assert.match(logs[0], /\[redacted\]/);
  const events: string[] = [];
  const forwarder = createEventForwarder((event) => events.push(event.sink));
  forwarder.send('audit', { event: { action: 'access' } });
  forwarder.send('analytics', { eventType: 'rule' });
  forwarder.send(NAMED_EVENT_EXCLUSIONS[0], { collector: 'alerting' });
  assert.deepEqual(events, ['audit', 'analytics']);
  assert.equal(forwarder.excluded()[NAMED_EVENT_EXCLUSIONS[0]], 1);
  assert.throws(() => forwarder.send('unknown-sink', {}), /not forwarded or excluded/);
});

test('analytics reportEvent forwards a registered string event type and its data', () => {
  const { createAnalytics } = require('@elastic/ebt/client');
  const counters: Array<{ event_type: unknown; code: string }> = [];
  const client = createAnalytics({
    isDev: false,
    logger: new Proxy({}, { get: () => () => undefined }),
  });
  client.telemetryCounter$.subscribe((counter: { event_type: unknown; code: string }) => {
    counters.push(counter);
  });
  client.registerEventType({ eventType: 'worker_core_live', schema: {} });
  const report = parseAnalyticsReport('worker_core_live', { token: 't' });
  client.reportEvent(report.eventType, report.eventData);
  assert.equal(
    counters.some((item) => item.code === 'UnregisteredType'),
    false
  );
  assert.equal(counters[0].event_type, 'worker_core_live');
  assert.throws(
    () => parseAnalyticsReport({ eventType: 'worker_core_live', properties: { token: 't' } }, undefined),
    /eventType must be a string/
  );
  registerForwardedEventType(
    (definition) => client.registerEventType(definition),
    { eventType: 'gen_ai_token_count', schema: {} }
  );
  registerForwardedEventType(
    (definition) => client.registerEventType(definition),
    { eventType: 'gen_ai_token_count', schema: {} }
  );
  assert.throws(
    () =>
      registerForwardedEventType(() => {
        throw new Error('schema rejected');
      }, { eventType: 'other' }),
    /schema rejected/
  );
});

test('execution context matches Core opaque ids for concurrent tasks', async () => {
  const { ExecutionContextContainer } = require('../../../../../../../../src/core/packages/execution-context/server-internal/src/execution_context_container');
  const service = createExecutionContextService();
  const taskA = {
    type: 'task manager',
    name: 'run alerting:.es-query',
    id: 'task-a',
    description: 'run task',
  };
  const taskB = {
    type: 'task manager',
    name: 'run actions:.index',
    id: 'task-b',
    description: 'run task',
  };
  const headerFor = (requestId: string, context: object) =>
    `${requestId};kibana:${new ExecutionContextContainer(context).toString()}`;
  const [opaqueA, opaqueB] = await Promise.all([
    service.withContext(taskA, async () => {
      await Promise.resolve();
      const current = service.get();
      assert.equal(typeof current?.toJSON, 'function');
      assert.equal(current.toJSON().id, 'task-a');
      assert.equal(current.toJSON().description, 'run task');
      return service.getAsHeader('req-a');
    }),
    service.withContext(taskB, async () => {
      await Promise.resolve();
      const current = service.get();
      assert.equal(current.toJSON().id, 'task-b');
      return service.getAsHeader('req-b');
    }),
  ]);
  assert.equal(opaqueA, headerFor('req-a', taskA));
  assert.equal(opaqueB, headerFor('req-b', taskB));
  assert.notEqual(opaqueA, opaqueB);
  assert.equal(service.get(), undefined);
});

test('execution context is visible to nested calls and absent outside the run', () => {
  const service = createExecutionContextService();
  assert.equal(service.get(), undefined);
  const seen = service.withContext({ name: 'run task', id: 'abc' }, () => service.get());
  assert.deepEqual(seen?.toJSON(), { name: 'run task', id: 'abc' });
  assert.equal(
    runWithExecutionContext(undefined, () => service.get()),
    undefined
  );
});

test('saved object routing is an exact client-options allowlist and bridges unknown combos', () => {
  const demonstrated = {
    excludedExtensions: ['security'],
    includedHiddenTypes: ['action', 'action_task_params'],
  };
  const scoped = {
    ...baseRoute,
    target: 'scoped' as const,
    operation: 'bulkGet',
    types: ['action'],
    registeredTypes: ['action', 'action_task_params', 'alert', 'rules-settings'],
    providerOptions: demonstrated,
    defaultSpace: true,
  };
  assert.equal(routeSavedObject(scoped), 'local');
  assert.equal(
    routeSavedObject({
      ...scoped,
      providerOptions: {
        excludedExtensions: ['security', 'encryptedSavedObjects'],
        includedHiddenTypes: ['action', 'action_task_params'],
      },
    }),
    'bridge'
  );
  assert.equal(
    routeSavedObject({
      ...scoped,
      providerOptions: {
        excludedExtensions: ['encryptedSavedObjects', 'security'],
        includedHiddenTypes: ['action_task_params', 'action'],
      },
    }),
    'bridge'
  );
  assert.equal(routeSavedObject({ ...scoped, operation: 'get', types: ['alert'] }), 'bridge');
  assert.equal(routeSavedObject({ ...scoped, operation: 'openPointInTimeForType' }), 'bridge');
  assert.equal(routeSavedObject({ ...scoped, types: ['not-registered'] }), 'bridge');
  assert.equal(routeSavedObject({ ...scoped, defaultSpace: false }), 'bridge');
  assert.equal(
    routeSavedObject({ ...scoped, providerOptions: { excludedExtensions: ['security'] } }),
    'bridge'
  );
  assert.equal(routeSavedObject({ ...scoped, target: 'unsafeInternal' }), 'bridge');
  assert.equal(routeSavedObject({ ...scoped, options: { namespace: 'space-a' } }), 'bridge');
  assert.equal(
    routeSavedObject({
      ...baseRoute,
      target: 'internal',
      operation: 'get',
      types: ['alert'],
      providerOptions: undefined,
    }),
    'local'
  );
  assert.equal(
    routeSavedObject({
      ...baseRoute,
      target: 'internal',
      operation: 'get',
      types: ['alert'],
      providerOptions: demonstrated,
    }),
    'bridge'
  );
  const bulkOptions = savedObjectCallOptions('bulkGet', [
    [{ type: 'action', id: '1' }],
    { namespace: 'space-a' },
  ]);
  assert.equal(hasExplicitNamespace(bulkOptions), true);
  assert.equal(
    routeSavedObject({
      ...scoped,
      options: bulkOptions,
    }),
    'bridge'
  );
  const conflictOptions = savedObjectCallOptions('checkConflicts', [
    [{ type: 'action', id: '1', namespace: 'not-the-options' }],
    { namespace: 'space-b' },
  ]);
  assert.deepEqual(conflictOptions, { namespace: 'space-b' });
  assert.equal(
    routeSavedObject({
      ...scoped,
      operation: 'checkConflicts',
      options: conflictOptions,
    }),
    'bridge'
  );
});

test('task manager policy is boot versus run, not a task-type prefix', () => {
  assert.equal(decideTaskManagerCall('schedule', 'boot'), 'fence');
  assert.equal(decideTaskManagerCall('bulkSchedule', 'boot'), 'fence');
  assert.equal(decideTaskManagerCall('schedule', 'run'), 'bridge');
  assert.equal(decideTaskManagerCall('bulkSchedule', 'run'), 'bridge');
  assert.equal(decideTaskManagerCall('ensureScheduled', 'run'), 'fence');
  assert.equal(decideTaskManagerCall('ensureScheduled', 'boot'), 'fence');
  const seen = runInTmPhase('boot', () => decideTaskManagerCall('get'));
  assert.equal(seen, 'fence');
  assert.equal(decideTaskManagerCall('get', 'run'), 'bridge');
});

test('P2 contracts: task methods, config failure, log levels, and model versions', () => {
  for (const method of RUN_BRIDGED_TM_METHODS) {
    assert.equal(decideTaskManagerCall(method, 'run'), 'bridge');
    assert.equal(decideTaskManagerCall(method, 'boot'), 'fence');
  }
  assert.throws(
    () => captureEffectivePluginConfig(undefined, { alerting: 'xpack.alerting' }),
    /config capture unavailable/
  );
  assert.throws(
    () =>
      captureEffectivePluginConfig(
        () => {
          throw new Error('denied');
        },
        { alerting: 'xpack.alerting' }
      ),
    /config capture failed/
  );
  const captured = captureEffectivePluginConfig(() => ({ enabled: true }), {
    alerting: 'xpack.alerting',
  });
  assert.deepEqual(captured.keyPaths, ['alerting.enabled']);
  assert.equal(forwardLogLevel('fatal'), 'fatal');
  assert.equal(forwardLogLevel('trace'), 'trace');
  const base = { name: 'alert', mappings: { properties: { a: { type: 'keyword' } } } };
  const first = fingerprintSavedObjectType({ ...base, modelVersions: { 1: { changes: [] } } });
  const second = fingerprintSavedObjectType({ ...base, modelVersions: { 2: { changes: [] } } });
  const migrated = fingerprintSavedObjectType({
    ...base,
    modelVersions: { 1: { changes: [] } },
    migrations: { '8.8.0': 'fn' },
  });
  assert.notEqual(first, second);
  assert.notEqual(first, migrated);
});

test('readiness token mismatch fails closed and a matching fingerprint passes', () => {
  const type = {
    name: 'alert',
    mappings: { properties: { b: { type: 'long' }, a: { type: 'keyword' } } },
  };
  const fingerprint = fingerprintSavedObjectType(type);
  const reordered = fingerprintSavedObjectType({
    name: 'alert',
    mappings: { properties: { a: { type: 'keyword' }, b: { type: 'long' } } },
  });
  assert.equal(fingerprint, reordered);
  verifyRegistryReadiness({ generation: 1, fingerprints: { alert: fingerprint } }, [type]);
  assert.throws(
    () => verifyRegistryReadiness({ generation: 1, fingerprints: { alert: 'nope' } }, [type]),
    /readiness mismatch for saved object type alert/
  );
  assert.throws(() => verifyRegistryReadiness(undefined, [type]), /readiness token missing/);
});

test('config capture keeps values in memory and exposes only key paths', () => {
  const plain = toPlainConfig({
    enabled: true,
    encryptionKey: 'do-not-log',
    nested: { timeout: '5m' },
  }) as { encryptionKey: string };
  assert.equal(plain.encryptionKey, 'do-not-log');
  const paths = configKeyPaths(plain);
  assert.deepEqual(paths.sort(), ['enabled', 'encryptionKey', 'nested.timeout']);
  assert.equal(JSON.stringify(paths).includes('do-not-log'), false);
});

test('execution class parity fails closed and collateral losses refund at most three attempts', () => {
  resetResearchExecutionClasses();
  const mismatches = diffDefinitionParity(
    [{ type: 'alerting:.es-query', timeout: '5m', maxAttempts: 1, stateSchemaVersions: [1] }],
    [{ type: 'alerting:.es-query', timeout: '1m', maxAttempts: 1, stateSchemaVersions: [1] }]
  );
  assert.equal(mismatches.length > 0, true);
  assert.deepEqual(
    diffDefinitionParity(
      [{ type: 'alerting:.es-query', timeout: '5m', maxAttempts: 1, stateSchemaVersions: [1, 2] }],
      [{ type: 'alerting:.es-query', timeout: '5m', maxAttempts: 1, stateSchemaVersions: [1, 2] }]
    ),
    []
  );
  const error = markCollateralLoss(new Error('slot stopped'));
  const counts: boolean[] = [];
  for (let i = 0; i < COLLATERAL_RESCHEDULE_CAP + 1; i++) {
    counts.push(consumeCollateralReschedule('task-1', error).refunded);
  }
  assert.deepEqual(counts, [true, true, true, false]);
  assert.equal(consumeCollateralReschedule('task-1', new Error('real failure')).refunded, false);
  let ran = 0;
  registerExecutionClass({
    id: 'alerting',
    taskTypes: (type) => type.startsWith('alerting:'),
    enabled: () => true,
    createRunner: () => ({
      run: async () => {
        ran += 1;
        return { state: {} };
      },
    }),
  });
  const {
    createTaskRunnerWithResearchOverride,
  } = require('@kbn/task-manager-plugin/server/lib/research_runner_override');
  const runner = createTaskRunnerWithResearchOverride(
    'alerting:.es-query',
    () => ({ run: async () => ({ state: { from: 'main' } }) }),
    { taskInstance: {} }
  );
  return runner.run().then((result: { state: { from?: string } }) => {
    assert.equal(ran, 1);
    assert.equal(result.state.from, undefined);
    resetResearchExecutionClasses();
  });
});

const runCleanup = async (graceMs: number, cleanupMs: number) => {
  const specifier = require.resolve('../example_tasks');
  const registry = new ModuleRegistry(new Set([specifier]));
  registry.register('cleanupAfterCancel', specifier, 'cleanupAfterCancel');
  const host = new ExecutionHost(registry, { transport: 'thread', abortGraceMs: 50 });
  const controller = new AbortController();
  let cleaned = false;
  try {
    const outcome = await host.run({
      workloadClass: 'alerting',
      principal: 'alice',
      space: 'default',
      moduleId: 'cleanupAfterCancel',
      input: { cleanupMs },
      deadlineMs: 10000,
      signal: controller.signal,
      abortGraceMs: graceMs,
      capabilities: {
        fixture: {
          lever: 'capability_bundle',
          handler: async (operation) => {
            if (operation === 'started') controller.abort();
            if (operation === 'cleaned') cleaned = true;
          },
        },
      },
    });
    return { outcome, cleaned };
  } finally {
    await host.stop();
  }
};

test(
  'cleanup that finishes within the class cancel grace is not hard-stopped',
  { timeout: 20000 },
  async () => {
    resetResearchExecutionClasses();
    setResearchTaskDefinitionSource({
      get: (type) =>
        type === 'alerting:.es-query'
          ? { type, timeout: '5m', stateSchemaByVersion: { 1: {} } }
          : undefined,
    });
    try {
      assert.equal(deriveCancelGraceMs('5m', 2000), 30_000);
      assert.equal(deriveCancelGraceMs('1s', 2000), 10_000);
      assert.equal(deriveCancelGraceMs(undefined, 2000), 2000);
      assert.equal(resolveCancelGraceMs('alerting:.es-query', 50), 30_000);
      registerExecutionClass({
        id: 'alerting-cancel',
        taskTypes: (type) => type === 'alerting:.es-query',
        cancelGraceMs: (taskType) => (researchDefinitionMeta(taskType)?.timeout === '5m' ? 800 : 50),
        createRunner: () => ({ run: async () => ({ state: {} }) }),
      });
      const grace = resolveCancelGraceMs('alerting:.es-query', 50);
      assert.equal(grace, 800);
      const within = await runCleanup(grace, 200);
      assert.equal(within.cleaned, true);
      assert.equal(within.outcome.status, 'terminated');
      if (within.outcome.status === 'terminated') {
        assert.equal(within.outcome.stop, 'cooperative');
        assert.equal(within.outcome.graceful, true);
      }
      const overrun = await runCleanup(80, 400);
      assert.equal(overrun.cleaned, false);
      assert.equal(overrun.outcome.status, 'terminated');
      if (overrun.outcome.status === 'terminated') assert.equal(overrun.outcome.stop, 'hard');
    } finally {
      resetResearchExecutionClasses();
      setResearchTaskDefinitionSource(undefined);
    }
  }
);
