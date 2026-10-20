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
  consumeCollateralReschedule,
  diffDefinitionParity,
  markCollateralLoss,
  registerExecutionClass,
  resetResearchExecutionClasses,
  COLLATERAL_RESCHEDULE_CAP,
} from '@kbn/task-manager-plugin/server/lib/research_runner_override';
import {
  NAMED_EVENT_EXCLUSIONS,
  configKeyPaths,
  classifyFlagOverrides,
  createBootEsWriteFence,
  createEventForwarder,
  createExecutionContextService,
  createForwardingLogger,
  createPlatformReplica,
  decideTaskManagerCall,
  emptyPlatformReplicas,
  fingerprintSavedObjectType,
  isEsWrite,
  lookupBooleanFlag,
  routeSavedObject,
  runInTmPhase,
  runWithExecutionContext,
  toPlainConfig,
  verifyRegistryReadiness,
} from './index';

const registered = ['alert', 'action'];
const baseRoute = {
  localSo: true,
  target: 'scoped' as const,
  types: ['alert'],
  registeredTypes: registered,
  operation: 'get',
  defaultSpace: true,
  securityExcluded: true,
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
    () => handler({ scoped: false }, { method: 'PUT', path: '/secret-index/_doc/1' }, {}, {} as never),
    /boot ES write denied/
  );
  assert.equal(fence.summary().denied, 1);
  handler({ scoped: false }, { method: 'POST', path: '/logs/_search' }, {}, {} as never);
  fence.endBoot();
  handler({ scoped: false }, { method: 'POST', path: '/_bulk' }, {}, {} as never);
  assert.equal(fence.summary().writes, 1);
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
    featureFlags: { generation: 2, value: { booleans: { alertingFeature: false }, strings: {}, numbers: {} } },
    pricing: { generation: 2, value: { available: { 'platinum-only': false }, activeProduct: 'basic' } },
  });
  assert.equal(replica.booleanFlag('alertingFeature'), false);
  assert.equal(replica.price('platinum-only'), false);
  assert.equal(replica.activeProduct(), 'basic');
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

test('execution context is visible to nested calls and absent outside the run', () => {
  const service = createExecutionContextService();
  assert.equal(service.get(), undefined);
  const seen = service.withContext({ name: 'run task', id: 'abc' }, () => service.get());
  assert.deepEqual(seen, { name: 'run task', id: 'abc' });
  assert.equal(runWithExecutionContext(undefined, () => service.get()), undefined);
});

test('saved object routing is an explicit allowlist and bridges everything else', () => {
  assert.equal(routeSavedObject(baseRoute), 'local');
  assert.equal(routeSavedObject({ ...baseRoute, operation: 'openPointInTimeForType' }), 'bridge');
  assert.equal(routeSavedObject({ ...baseRoute, types: ['not-registered'] }), 'bridge');
  assert.equal(routeSavedObject({ ...baseRoute, defaultSpace: false }), 'bridge');
  assert.equal(routeSavedObject({ ...baseRoute, securityExcluded: false }), 'bridge');
  assert.equal(routeSavedObject({ ...baseRoute, target: 'unsafeInternal' }), 'bridge');
  assert.equal(
    routeSavedObject({ ...baseRoute, options: { namespace: 'space-a' } }),
    'bridge'
  );
  assert.equal(routeSavedObject({ ...baseRoute, target: 'internal', securityExcluded: false }), 'local');
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

test('readiness token mismatch fails closed and a matching fingerprint passes', () => {
  const type = { name: 'alert', mappings: { properties: { b: { type: 'long' }, a: { type: 'keyword' } } } };
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
    createRunner: () => ({ run: async () => { ran += 1; return { state: {} }; } }),
  });
  const { createTaskRunnerWithResearchOverride } = require('@kbn/task-manager-plugin/server/lib/research_runner_override');
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
