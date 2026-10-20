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
import {
  armResearchLease,
  clearResearchLease,
  consumeCollateralReschedule,
  deriveCancelGraceMs,
  markResearchExecutionStarted,
  researchClaimRetryAt,
  researchExecutionBudgetMs,
  researchExpiration,
  researchFirstRetryDelayMs,
  researchPersistedAttempts,
  researchPersistedRetryAt,
  RESEARCH_BOOTSTRAP_DEADLINE_MS,
  RESEARCH_RECOVERY_CAP_MS,
  diffDefinitionParity,
  markCollateralLoss,
  registerExecutionClass,
  researchDefinitionMeta,
  resetResearchExecutionClasses,
  resolveCancelGraceMs,
  setResearchTaskDefinitionSource,
  COLLATERAL_RESCHEDULE_CAP,
} from '@kbn/task-manager-plugin/server/lib/research_runner_override';
import { encode } from '../codecs';
import { ExecutionHost, cooperativeStopFor } from '../host';
import type { Packet } from '../protocol';
import { ModuleRegistry } from '../registry';
import { guardReplicaWatch } from '../../t7a/isolate/replica_watch';
import { beginRunThenCancel, bindRunnerCancel } from '../../t7a/isolate/runner_cancel';
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
  assertNoInternalRepositoryExtensions,
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

test('requestOptions.querystring overrides params the way transport merges them', () => {
  const fence = createBootEsWriteFence({ mode: 'deny', allow: [] });
  const handler = fence.wrap(() => () => undefined)({ logger: {} as never });
  assert.throws(
    () =>
      handler(
        { scoped: false },
        { method: 'GET', path: '/orders/_doc/1' },
        { querystring: { refresh: true } },
        {} as never
      ),
    /boot ES write denied/
  );
  assert.throws(
    () =>
      handler(
        { scoped: false },
        { method: 'GET', path: '/orders/_doc/1', querystring: { refresh: false } },
        { querystring: { refresh: true } },
        {} as never
      ),
    /boot ES write denied/
  );
  assert.equal(fence.summary().denied, 2);
  assert.equal(fence.summary().reads, 0);
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
      handler(
        { scoped: false },
        { method: 'POST', path: '/orders/_update/_simulate' },
        {},
        {} as never
      ),
    /boot ES write denied/
  );
  assert.throws(
    () =>
      handler(
        { scoped: false },
        { method: 'POST', path: '/orders/_mget', querystring: { refresh: 'true' } },
        {},
        {} as never
      ),
    /boot ES write denied/
  );
  assert.throws(
    () =>
      handler(
        { scoped: false },
        { method: 'GET', path: '/orders/_refresh' },
        {},
        {} as never
      ),
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
  assert.equal(fence.summary().denied, 7);
  assert.equal(fence.summary().writes, 9);
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
  const flags: Array<boolean | undefined> = [];
  let completed = false;
  const subscription = replica.booleanFlag$('workerCore.liveProbe', false).subscribe({
    next: (value: boolean | undefined) => flags.push(value),
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
  assert.deepEqual(flags, [undefined, true]);
  replica.apply({
    ...emptyPlatformReplicas(),
    featureFlags: { generation: 3, value: { booleans: {}, strings: {}, numbers: {} } },
    status: {
      generation: 2,
      value: { elasticsearch: 'available', savedObjects: 'degraded', overall: 'degraded' },
    },
  });
  assert.deepEqual(flags, [undefined, true, undefined]);
  const absent: Array<boolean | undefined> = [];
  replica
    .booleanFlag$('not-owned', false)
    .subscribe((value: boolean | undefined) => absent.push(value));
  assert.deepEqual(absent, [undefined]);
  replica.apply({
    ...emptyPlatformReplicas(),
    featureFlags: { generation: 4, value: { booleans: {}, strings: {}, numbers: {} } },
    status: {
      generation: 2,
      value: { elasticsearch: 'available', savedObjects: 'degraded', overall: 'degraded' },
    },
  });
  assert.deepEqual(absent, [undefined, undefined]);
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
    () =>
      parseAnalyticsReport(
        { eventType: 'worker_core_live', properties: { token: 't' } },
        undefined
      ),
    /eventType must be a string/
  );
  registerForwardedEventType((definition) => client.registerEventType(definition), {
    eventType: 'gen_ai_token_count',
    schema: {},
  });
  registerForwardedEventType((definition) => client.registerEventType(definition), {
    eventType: 'gen_ai_token_count',
    schema: {},
  });
  assert.throws(
    () =>
      registerForwardedEventType(
        () => {
          throw new Error('schema rejected');
        },
        { eventType: 'other' }
      ),
    /schema rejected/
  );
});

test('set replaces the execution context and labels match Core', () => {
  const service = createExecutionContextService();
  service.set({
    name: 'parent',
    id: 'p',
    page: 'alerts',
    meta: { rule: 'es-query', skip: undefined },
  });
  service.withContext({ name: 'child', id: 'c' }, () => {
    assert.equal(service.get()?.toJSON().child?.id, 'c');
  });
  assert.deepEqual(service.getAsLabels(), {
    name: 'parent',
    id: 'p',
    page: 'alerts',
    kibana_meta_rule: 'es-query',
  });
  assert.equal(service.get()?.toJSON().child, undefined);
});

test('internal repository extensions fail closed', () => {
  assertNoInternalRepositoryExtensions(undefined);
  assertNoInternalRepositoryExtensions({});
  assert.throws(
    () => assertNoInternalRepositoryExtensions({ securityExtension: {} }),
    /internal repository extensions are not supported/
  );
});

test('execution context matches Core opaque ids for concurrent tasks', async () => {
  const {
    ExecutionContextContainer,
  } = require('@kbn/core-execution-context-server-internal/src/execution_context_container');
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
        cancelGraceMs: (taskType) =>
          researchDefinitionMeta(taskType)?.timeout === '5m' ? 800 : 50,
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

test('aborting a replica wait settles it and drops the waiter', async () => {
  const queue = createReplicaWaitQueue();
  const controller = new AbortController();
  let settled = false;
  const pending = queue.wait('stable', controller.signal).then(() => {
    settled = true;
  });
  controller.abort();
  const result = await Promise.race([
    pending.then(() => 'settled'),
    new Promise((resolve) => setTimeout(() => resolve('hung'), 40)),
  ]);
  assert.equal(result, 'settled');
  assert.equal(settled, true);
  assert.equal(queue.size(), 0);
  queue.publish('changed');
  await Promise.resolve();
  assert.equal(queue.size(), 0);
});

const READ_ENDPOINT_NAMES = [
  '_search',
  '_msearch',
  '_async_search',
  '_count',
  '_field_caps',
  '_mget',
  '_pit',
  '_query',
  '_analyze',
] as const;

test('read classification is anchored and document ids cannot impersonate endpoints', () => {
  assert.equal(isEsWrite('POST', '/orders/_update/_search'), true);
  assert.equal(isEsWrite('POST', '/orders/_update/_query'), true);
  assert.equal(isEsWrite('POST', '/orders/_doc/_mget'), true);
  assert.equal(isEsWrite('POST', '/orders/_search'), false);
  assert.equal(isEsWrite('POST', '/orders/_eql/search'), true);
  assert.equal(isEsWrite('POST', '/_render/template'), true);
  assert.equal(isEsWrite('DELETE', '/_pit'), false);
  assert.equal(isEsWrite('POST', '/_search/scroll'), false);
  assert.equal(isEsWrite('POST', '/%5Fsearch'), true);
  assert.equal(isEsWrite('POST', '/orders/../_search'), true);
  assert.equal(isEsWrite('POST', '//orders/_search'), true);
  for (const name of READ_ENDPOINT_NAMES) {
    assert.equal(isEsWrite('POST', `/orders/_doc/${name}`), true, name);
    assert.equal(isEsWrite('POST', `/orders/_update/${name}`), true, name);
    assert.equal(isEsWrite('POST', `/orders/_create/${name}`), true, name);
  }
  assert.equal(isEsWrite('POST', '/_scripts/_search'), true);
  assert.equal(isEsWrite('POST', '/_scripts/_mget'), true);
  assert.equal(isEsWrite('POST', '/_scripts/_query'), true);
  const admitted = adversarialWriteCandidates().filter((path) => !isEsWrite('POST', path));
  assert.equal(adversarialWriteCandidates().length, 242);
  assert.deepEqual(admitted, []);
  assert.equal(isEsWrite('GET', '/orders/_refresh'), true);
  assert.equal(isEsWrite('GET', '/orders/_flush'), true);
  assert.equal(isEsWrite('GET', '/_refresh'), true);
  assert.equal(isEsWrite('GET', '/orders/_doc/1?refresh=true'), true);
  assert.equal(isEsWrite('HEAD', '/orders/_doc/1?refresh=wait_for'), true);
  assert.equal(isEsWrite('POST', '/orders/_mget', { refresh: 'true' }), true);
  assert.equal(isEsWrite('POST', '/orders/_search?pipeline=ingest'), true);
  assert.equal(isEsWrite('OPTIONS', '/orders/_search'), true);
  assert.equal(isEsWrite('TRACE', '/orders'), true);
  assert.equal(isEsWrite('CONNECT', '/orders/_doc/1'), true);
  assert.equal(isEsWrite('GET', '/orders/_doc/1'), false);
  assert.equal(isEsWrite('GET', '/orders/_doc/1?refresh=false'), false);
  assert.equal(isEsWrite('GET', '/.kibana-event-log-*/_settings'), false);
  assert.equal(isEsWrite('HEAD', '/_index_template/.kibana-event-log-template'), false);
  const queryAdmitted = adversarialQueryCandidates().filter(
    (candidate) => !isEsWrite(candidate.method, candidate.path, candidate.query)
  );
  assert.deepEqual(queryAdmitted, []);
  assert.equal(isEsWrite('GET', '/orders/_doc/1?routing=1;refresh=true'), true);
  assert.equal(isEsWrite('HEAD', '/orders/_doc/1?routing=1?&refresh=true'), true);
  assert.equal(isEsWrite('POST', '/orders/_mget', 'preference=a;refresh=true'), true);
  assert.equal(isEsWrite('GET', '/orders/_doc/1', 'routing=1?&refresh=true'), true);
  const grammar = grammarRefreshCandidates();
  assert.equal(grammar.length, 32);
  const grammarAdmitted = grammar.filter(
    (candidate) => !isEsWrite(candidate.method, candidate.path, candidate.query)
  );
  assert.deepEqual(grammarAdmitted, []);
  assert.equal(isEsWrite('GET', '/.kibana-event-log-*/_settings', { expand_wildcards: 'all' }), false);
});

/** Recreates the 242-path set: document ids, bulk shapes, underscore ids, encoding, slashes, queries. */
const adversarialWriteCandidates = (): string[] => {
  const names = READ_ENDPOINT_NAMES;
  const paths: string[] = [];
  for (const api of ['_doc', '_update', '_create']) {
    for (const name of names) {
      paths.push(`/orders/${api}/${name}`);
      paths.push(`/${api}/${name}`);
    }
  }
  paths.push('/_bulk', '/orders/_bulk');
  for (const name of names) {
    paths.push(`/_bulk/${name}`, `/orders/_bulk/${name}`, `/${name}/_bulk`);
  }
  for (const root of ['_scripts', '_cluster', '_nodes', '_security']) {
    for (const name of names) paths.push(`/${root}/${name}`);
  }
  for (const name of names) {
    paths.push(`/%5F${name.slice(1)}`, `/orders/${name}%2Fsecret`, `/_scripts%2F${name.slice(1)}`);
  }
  for (const name of names) {
    paths.push(`//orders/${name}`, `/orders//${name}`, `/orders/${name}//`, `//_scripts/${name}`);
  }
  for (const name of names) {
    paths.push(`/_bulk?${name}`, `/orders/_update/1?${name}=1`);
  }
  paths.push(
    '/orders/_doc/1',
    '/orders/_update/1',
    '/orders/_create/1',
    '/orders/_delete_by_query',
    '/orders/_update_by_query',
    '/.kibana-event-log-ds/_delete_by_query',
    '/orders/_update/_simulate',
    '/.kibana_locks-000001/_delete_by_query',
    '/.kibana_locks-000001/_update',
    '/orders/.kibana_locks-000001/_update/lock-id',
    '/_scripts',
    '/orders/_refresh',
    '/orders/_flush',
    '/_mapping',
    '/orders/_mapping',
    '/_aliases',
    '/orders/_aliases',
    '/_ilm/policy/x',
    '/_security/user/elastic',
    '/_template/legacy',
    '/orders/_doc',
    '/_update/_query',
    '/_doc/_mget',
    '/orders/_update/_search',
    '/orders/_update/_query',
    '/orders/_doc/_mget',
    '/secret-index/_doc/1',
    '/_component_template',
    '/_data_stream/orders',
    '/orders/_clone/other',
    '/orders/_split/other',
    '/orders/_shrink/other',
    '/_reindex',
    '/orders/_rollover',
    '/_snapshot/repo/snap',
    '/_slm/policy/p',
    '/_ml/anomaly_detectors/j',
    '/_ingest/pipeline/p',
    '/_index_template/orders',
    '/orders/_settings',
    '/_cluster/settings',
    '/_nodes/reload_secure_settings'
  );
  return paths;
};

/** Semicolon, a second '?', duplicate keys, and unknown names. All 32 must be writes. */
const grammarRefreshCandidates = (): Array<{
  method: string;
  path: string;
  query?: string | Record<string, string>;
}> => {
  const bases = [
    { method: 'GET', path: '/orders/_doc/1' },
    { method: 'HEAD', path: '/orders/_doc/1' },
    { method: 'POST', path: '/orders/_mget' },
    { method: 'GET', path: '/orders/_search' },
  ];
  const candidates: Array<{
    method: string;
    path: string;
    query?: string | Record<string, string>;
  }> = [];
  for (const base of bases) {
    candidates.push({ ...base, path: `${base.path}?routing=1;refresh=true` });
    candidates.push({ ...base, path: `${base.path}?routing=1?&refresh=true` });
    candidates.push({ ...base, query: 'preference=a;refresh=true' });
    candidates.push({ ...base, query: 'routing=1?&refresh=true' });
    candidates.push({ ...base, path: `${base.path}?refresh=true&refresh=false` });
    candidates.push({ ...base, query: { preference: 'a;refresh=true' } });
    candidates.push({ ...base, path: `${base.path}?routing=1` });
    candidates.push({ ...base, query: 'refresh=true' });
  }
  return candidates;
};

/** Query-param and admin-GET writes. A refresh=false document get stays out of this set. */
const adversarialQueryCandidates = (): Array<{
  method: string;
  path: string;
  query?: Record<string, string>;
}> => {
  const paths = [
    '/orders/_search',
    '/orders/_mget',
    '/_query',
    '/orders/_doc/1',
    '/orders/_source/1',
    '/_search/scroll',
  ];
  const candidates: Array<{ method: string; path: string; query?: Record<string, string> }> = [];
  for (const path of paths) {
    candidates.push({ method: 'POST', path: `${path}?refresh=true` });
    candidates.push({ method: 'GET', path: `${path}?refresh=wait_for` });
    candidates.push({ method: 'POST', path, query: { refresh: 'true' } });
    candidates.push({ method: 'POST', path, query: { refresh: 'wait_for' } });
    candidates.push({ method: 'POST', path: `${path}?pipeline=p` });
    candidates.push({ method: 'POST', path, query: { wait_for_active_shards: '1' } });
  }
  for (const method of ['OPTIONS', 'TRACE', 'CONNECT', 'FOO']) {
    candidates.push({ method, path: '/orders/_search' });
  }
  candidates.push(
    { method: 'GET', path: '/orders/_refresh' },
    { method: 'GET', path: '/orders/_flush' },
    { method: 'GET', path: '/_flush' },
    { method: 'HEAD', path: '/orders/_doc/1?refresh=true' },
    { method: 'GET', path: '/orders/_forcemerge' }
  );
  return candidates;
};

test('an already-aborted host signal still cancels the runner', () => {
  const signal = AbortSignal.abort(new Error('boot finished after cancel'));
  const abortController = new AbortController();
  let cancels = 0;
  bindRunnerCancel(signal, abortController, async () => {
    cancels += 1;
  });
  assert.equal(cancels, 1);
  assert.equal(abortController.signal.aborted, true);
});

test('a cancel rejection during boot does not escape the binder', async () => {
  const signal = AbortSignal.abort(new Error('boot finished after cancel'));
  const abortController = new AbortController();
  let rejected = false;
  const onRejection = () => {
    rejected = true;
  };
  process.on('unhandledRejection', onRejection);
  try {
    bindRunnerCancel(signal, abortController, async () => {
      throw new Error('AlertingEventLogger not initialized');
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(rejected, false);
    assert.equal(abortController.signal.aborted, true);
  } finally {
    process.removeListener('unhandledRejection', onRejection);
  }
});

test('an already-aborted signal does not start the run', async () => {
  const signal = AbortSignal.abort(new Error('boot finished after cancel'));
  const abortController = new AbortController();
  const order: string[] = [];
  const { pending, unbind, cancelledBeforeStart } = beginRunThenCancel(signal, abortController, {
    run: async () => {
      order.push('run');
      return 'ran';
    },
    cancel: async () => {
      order.push('cancel');
    },
  });
  try {
    assert.equal(cancelledBeforeStart, true);
    assert.equal(await pending, undefined);
    assert.deepEqual(order, []);
    assert.equal(abortController.signal.aborted, false);
  } finally {
    unbind();
  }
});

test('a cancel rejection after run has started fails the run', async () => {
  const signal = new AbortController();
  const abortController = new AbortController();
  const { pending, unbind } = beginRunThenCancel(signal.signal, abortController, {
    run: async () => {
      signal.abort();
      return 'ran';
    },
    cancel: async () => {
      throw new Error('cancel failed');
    },
  });
  try {
    await assert.rejects(pending, /cancel failed/);
  } finally {
    unbind();
  }
});

test('cooperative stop reads a thrown result and a failed packet', () => {
  assert.equal(
    cooperativeStopFor(false, { thrown: { message: 'cancel failed' } }),
    'cooperative-failed'
  );
  assert.equal(cooperativeStopFor(true, { ok: true }), 'cooperative-failed');
  assert.equal(cooperativeStopFor(false, { phase: 'run' }), 'cooperative');
  assert.equal(cooperativeStopFor(false, { cancelledBeforeStart: true }), 'cooperative');
});

test('replica watch joins on every early failure path', async () => {
  const paths = [
    'success',
    'runner-rejection',
    'pre-aborted',
    'parity',
    'missing-definition',
    'create-runner',
  ] as const;
  for (const path of paths) {
    let open = 0;
    const controller = new AbortController();
    const watch = new Promise<void>((resolve) => {
      open += 1;
      const finish = () => {
        open -= 1;
        resolve();
      };
      controller.signal.addEventListener('abort', finish, { once: true });
    });
    const body = async () => {
      if (path !== 'success') throw new Error(path);
      return path;
    };
    if (path === 'success') {
      assert.equal(await guardReplicaWatch(watch, () => controller.abort(), body), 'success');
    } else {
      await assert.rejects(
        guardReplicaWatch(watch, () => controller.abort(), body),
        new RegExp(path)
      );
    }
    assert.equal(open, 0, path);
  }
});

test(
  'a failed terminal during cancel is not recorded as cooperative completion',
  { timeout: 20000 },
  async () => {
    const specifier = require.resolve('../example_tasks');
    const registry = new ModuleRegistry(new Set([specifier]));
    registry.register('failAfterCancel', specifier, 'failAfterCancel');
    const host = new ExecutionHost(registry, { transport: 'thread', abortGraceMs: 2000 });
    const controller = new AbortController();
    try {
      const outcome = await host.run({
        workloadClass: 'alerting',
        principal: 'alice',
        space: 'default',
        moduleId: 'failAfterCancel',
        input: {},
        deadlineMs: 10000,
        signal: controller.signal,
        capabilities: {
          fixture: {
            lever: 'capability_bundle',
            handler: async (operation) => {
              if (operation === 'started') controller.abort();
            },
          },
        },
      });
      assert.equal(outcome.status, 'terminated');
      if (outcome.status === 'terminated') {
        assert.equal(outcome.stop, 'cooperative-failed');
        assert.notEqual(outcome.stop, 'cooperative');
        assert.equal(outcome.graceful, true);
      }
    } finally {
      await host.stop();
    }
  }
);

test('a detached log call does not fail the task as outstanding', { timeout: 20000 }, async () => {
  const specifier = require.resolve('../example_tasks');
  const registry = new ModuleRegistry(new Set([specifier]));
  registry.register('fireAndForget', specifier, 'fireAndForget');
  const host = new ExecutionHost(registry, { transport: 'thread', abortGraceMs: 200 });
  let wrote = false;
  try {
    const outcome = await host.run({
      workloadClass: 'alerting',
      principal: 'alice',
      space: 'default',
      moduleId: 'fireAndForget',
      input: {},
      deadlineMs: 5000,
      capabilities: {
        fixture: {
          lever: 'capability_bundle',
          handler: async () => {
            await new Promise((resolve) => setTimeout(resolve, 40));
            wrote = true;
            return { ok: true };
          },
        },
      },
    });
    assert.equal(outcome.status, 'success');
    if (outcome.status === 'success') assert.deepEqual(outcome.value, { ok: true });
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(wrote, true);
  } finally {
    await host.stop();
  }
});

test(
  'a task that aborts its own capability call does not leave it outstanding',
  { timeout: 20000 },
  async () => {
    const specifier = require.resolve('../example_tasks');
    const registry = new ModuleRegistry(new Set([specifier]));
    registry.register('abortOwnCall', specifier, 'abortOwnCall');
    const host = new ExecutionHost(registry, { transport: 'thread', abortGraceMs: 200 });
    try {
      const outcome = await host.run({
        workloadClass: 'alerting',
        principal: 'alice',
        space: 'default',
        moduleId: 'abortOwnCall',
        input: {},
        deadlineMs: 800,
        capabilities: {
          fixture: {
            lever: 'capability_bundle',
            handler: async (_operation, _args, _bundle, call) => {
              await new Promise((_resolve, reject) => {
                const signal = call?.signal;
                if (!signal) return;
                if (signal.aborted) reject(new Error('aborted'));
                else
                  signal.addEventListener('abort', () => reject(new Error('aborted')), {
                    once: true,
                  });
              });
            },
          },
        },
      });
      assert.equal(outcome.status, 'success');
      if (outcome.status === 'success') assert.deepEqual(outcome.value, { released: true });
    } finally {
      await host.stop();
    }
  }
);

test('bulk item namespaces bridge even when an options bag is present', () => {
  const options = savedObjectCallOptions('bulkCreate', [
    [{ type: 'action_task_params', id: '1', initialNamespaces: ['foreign'] }],
    { overwrite: false },
  ]);
  assert.equal(hasExplicitNamespace(options), true);
  assert.equal(
    routeSavedObject({
      ...baseRoute,
      target: 'scoped',
      operation: 'bulkCreate',
      types: ['action_task_params'],
      registeredTypes: ['action', 'action_task_params', 'alert', 'rules-settings'],
      providerOptions: {
        excludedExtensions: ['security'],
        includedHiddenTypes: ['action', 'action_task_params'],
      },
      defaultSpace: true,
      options,
    }),
    'bridge'
  );
});

const scriptedEndpoint = (
  script: (runId: string, send: (packet: Packet) => void) => void
) => {
  let handler: (packet: Packet) => void = () => {};
  return () => ({
    send(packet: Packet) {
      if (packet.kind !== 'run') return;
      script(packet.bundle.runId, handler);
    },
    onMessage(next: (packet: Packet) => void) {
      handler = next;
      handler({ version: 1, kind: 'ready' });
    },
    onExit() {},
    stop: async () => {},
  });
};

test('rule budget starts when execution starts, after bootstrap', async () => {
  const registry = new ModuleRegistry(new Set());
  const host = new ExecutionHost(
    registry,
    { abortGraceMs: 50 },
    scriptedEndpoint((runId, send) => {
      setTimeout(() => send({ version: 1, kind: 'execution_start', runId }), 100);
      setTimeout(
        () =>
          send({
            version: 1,
            kind: 'outcome',
            runId,
            value: encode({ ok: true }),
            failed: false,
            heapUsed: 1,
            rss: 1,
          }),
        200
      );
    })
  );
  const outcome = await host.run({
    workloadClass: 'budget',
    moduleId: 'unused',
    input: {},
    principal: 'alice',
    space: 'default',
    capabilities: {},
    deadlineMs: 150,
    bootstrapDeadlineMs: 500,
  });
  assert.equal(outcome.status, 'success');
  await host.stop();
});

test('a boot that never starts execution dies at the bootstrap deadline', async () => {
  const registry = new ModuleRegistry(new Set());
  const host = new ExecutionHost(
    registry,
    { abortGraceMs: 20 },
    scriptedEndpoint((runId, send) => {
      setTimeout(
        () =>
          send({
            version: 1,
            kind: 'outcome',
            runId,
            value: encode({ ok: true }),
            failed: false,
            heapUsed: 1,
            rss: 1,
          }),
        250
      );
    })
  );
  const outcome = await host.run({
    workloadClass: 'wedged',
    moduleId: 'unused',
    input: {},
    principal: 'alice',
    space: 'default',
    capabilities: {},
    deadlineMs: 1000,
    bootstrapDeadlineMs: 80,
  });
  assert.equal(outcome.status, 'terminated');
  if (outcome.status === 'terminated') assert.equal(outcome.reason, 'deadline');
  await host.stop();
});

test('a late execution_start after the bootstrap deadline is rejected', async () => {
  const registry = new ModuleRegistry(new Set());
  const host = new ExecutionHost(
    registry,
    { abortGraceMs: 40 },
    scriptedEndpoint((runId, send) => {
      setTimeout(() => {
        // Block the host loop so the bootstrap timer is overdue but has not run yet.
        const end = Date.now() + 80;
        while (Date.now() < end) {
          /* spin */
        }
        send({ version: 1, kind: 'execution_start', runId });
        setTimeout(
          () =>
            send({
              version: 1,
              kind: 'outcome',
              runId,
              value: encode({ ok: true }),
              failed: false,
              heapUsed: 1,
              rss: 1,
            }),
          30
        );
      }, 10);
    })
  );
  const outcome = await host.run({
    workloadClass: 'late-start',
    moduleId: 'unused',
    input: {},
    principal: 'alice',
    space: 'default',
    capabilities: {},
    deadlineMs: 500,
    bootstrapDeadlineMs: 40,
  });
  assert.equal(outcome.status, 'terminated');
  if (outcome.status === 'terminated') assert.equal(outcome.reason, 'deadline');
  await host.stop();
});

test('a duplicate execution_start does not extend the rule budget', async () => {
  const registry = new ModuleRegistry(new Set());
  const host = new ExecutionHost(
    registry,
    { abortGraceMs: 20 },
    scriptedEndpoint((runId, send) => {
      setTimeout(() => send({ version: 1, kind: 'execution_start', runId }), 40);
      setTimeout(() => send({ version: 1, kind: 'execution_start', runId }), 90);
      setTimeout(
        () =>
          send({
            version: 1,
            kind: 'outcome',
            runId,
            value: encode({ ok: true }),
            failed: false,
            heapUsed: 1,
            rss: 1,
          }),
        150
      );
    })
  );
  const outcome = await host.run({
    workloadClass: 'duplicate-start',
    moduleId: 'unused',
    input: {},
    principal: 'alice',
    space: 'default',
    capabilities: {},
    deadlineMs: 80,
    bootstrapDeadlineMs: 500,
  });
  assert.equal(outcome.status, 'terminated');
  if (outcome.status === 'terminated') assert.equal(outcome.reason, 'deadline');
  await host.stop();
});

test('execution_start during cancel does not resurrect the run', async () => {
  const registry = new ModuleRegistry(new Set());
  const controller = new AbortController();
  const host = new ExecutionHost(
    registry,
    { abortGraceMs: 200 },
    scriptedEndpoint((runId, send) => {
      setTimeout(() => controller.abort(), 30);
      setTimeout(() => send({ version: 1, kind: 'execution_start', runId }), 60);
      setTimeout(
        () =>
          send({
            version: 1,
            kind: 'outcome',
            runId,
            value: encode({ ok: true }),
            failed: false,
            heapUsed: 1,
            rss: 1,
          }),
        100
      );
    })
  );
  const outcome = await host.run({
    workloadClass: 'no-resurrect',
    moduleId: 'unused',
    input: {},
    principal: 'alice',
    space: 'default',
    capabilities: {},
    deadlineMs: 1000,
    bootstrapDeadlineMs: 500,
    signal: controller.signal,
  });
  assert.equal(outcome.status, 'terminated');
  if (outcome.status === 'terminated') assert.equal(outcome.reason, 'cancelled');
  await host.stop();
});

test('a research lease keeps the claim through boot and starts the rule budget once', () => {
  armResearchLease({
    taskId: 'lease-1',
    claimedAt: 1_000,
    bootstrapMs: 30_000,
    executionMs: 1_000,
  });
  assert.equal(researchExpiration('lease-1')?.getTime(), 32_000);
  markResearchExecutionStarted('lease-1', 5_000);
  assert.equal(researchExpiration('lease-1')?.getTime(), 6_000);
  markResearchExecutionStarted('lease-1', 9_000);
  assert.equal(researchExpiration('lease-1')?.getTime(), 6_000);
  clearResearchLease('lease-1');
  assert.equal(researchExpiration('lease-1'), undefined);
});

test('claim arms a protected lease before a later stub and refunds persisted attempts', () => {
  resetResearchExecutionClasses();
  setResearchTaskDefinitionSource({
    get: (type) =>
      type === 'alerting:.es-query'
        ? { type, timeout: '1s', stateSchemaByVersion: { 1: {} } }
        : undefined,
  });
  registerExecutionClass({
    id: 'alerting-lease',
    taskTypes: (type) => type === 'alerting:.es-query',
    createRunner: () => ({ run: async () => ({ state: {} }) }),
  });
  const now = 1_000_000;
  const claimed = researchClaimRetryAt(
    { id: 'rule-1', taskType: 'alerting:.es-query', schedule: { interval: '1m' } },
    now
  );
  assert.equal(
    claimed?.getTime(),
    now + RESEARCH_BOOTSTRAP_DEADLINE_MS + deriveCancelGraceMs('1s', 0)
  );
  assert.equal(researchFirstRetryDelayMs('rule-1'), 0);
  armResearchLease({
    taskId: 'rule-1',
    claimedAt: now + 50_000,
    bootstrapMs: 1,
    executionMs: 1,
  });
  assert.equal(
    researchExpiration('rule-1')?.getTime(),
    now + RESEARCH_BOOTSTRAP_DEADLINE_MS + 1000
  );
  markResearchExecutionStarted('rule-1', now + 4_000);
  const renewed = researchPersistedRetryAt('rule-1', now + 4_000);
  const grace = deriveCancelGraceMs('1s', 0);
  assert.equal(renewed?.getTime(), now + 4_000 + 1000 + grace);
  assert.ok((renewed?.getTime() ?? 0) - (now + 4_000) <= RESEARCH_RECOVERY_CAP_MS);
  const adHoc = researchExecutionBudgetMs('alerting:.es-query', 60_000, '2s');
  assert.equal(adHoc, 2000);
  const scheduled = researchExecutionBudgetMs('alerting:.es-query', 60_000);
  assert.equal(scheduled, 1000);
  const error = markCollateralLoss(new Error('slot stopped'));
  assert.equal(researchPersistedAttempts('rule-1', 1, error), 0);
  assert.equal(researchPersistedAttempts('rule-1', 1, new Error('real')), 1);
  clearResearchLease('rule-1');
  resetResearchExecutionClasses();
  setResearchTaskDefinitionSource(undefined);
});

test('an owner invalidation bumps the flag generation when the override map is unchanged', () => {
  const flags = { booleans: { 'workerCore.liveProbe': false }, strings: {}, numbers: {} };
  const first = advanceGeneration('', 1, { flags, invalidation: 0 });
  const same = advanceGeneration(first.hash, first.generation, { flags, invalidation: 0 });
  const invalidated = advanceGeneration(first.hash, first.generation, { flags, invalidation: 1 });
  assert.equal(same.generation, first.generation);
  assert.equal(invalidated.generation, first.generation + 1);
});
