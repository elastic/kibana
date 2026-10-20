/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Proves the bootstrap lease on a reloaded Elasticsearch task document.
 * Run: node .../worker_core/lease_es_probe.cts
 * KBN_RESEARCH_LEASE_RED=1 claims without an execution class so the ordinary retryAt fails the lease check.
 */

require('@kbn/setup-node-env');

const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const { Subject } = require('rxjs');
const { Client } = require('@elastic/elasticsearch');
const { asOk, asErr } = require('../../../../../../../platform/plugins/shared/task_manager/server/lib/result_type');
const { TaskTypeDictionary } = require('../../../../../../../platform/plugins/shared/task_manager/server/task_type_dictionary');
const { TaskManagerRunner } = require('../../../../../../../platform/plugins/shared/task_manager/server/task_running/task_runner');
const { claimAvailableTasksMget } = require('../../../../../../../platform/plugins/shared/task_manager/server/task_claimers/strategy_mget');
const {
  RESEARCH_BOOTSTRAP_DEADLINE_MS,
  RESEARCH_RECOVERY_CAP_MS,
  clearResearchLease,
  deriveCancelGraceMs,
  markCollateralLoss,
  markResearchExecutionStarted,
  registerExecutionClass,
  resetResearchExecutionClasses,
  setResearchTaskDefinitionSource,
} = require('../../../../../../../platform/plugins/shared/task_manager/server/lib/research_runner_override');

const INDEX = '.kibana_task_manager_9.6.0_001';
const TYPE = 'research:lease-probe';
const red = process.env.KBN_RESEARCH_LEASE_RED === '1';
const es = new Client({
  node: process.env.T7A_ES ?? 'http://localhost:9281',
  auth: { username: 'kibana_system', password: 'changeme' },
});

const logger = {
  trace() {},
  debug() {},
  info() {},
  warn(message) {
    if (String(message).includes('no assigned partitions')) return;
    console.warn(String(message));
  },
  error(message) {
    console.error(message instanceof Error ? message.stack ?? message.message : String(message));
  },
  fatal(message) {
    console.error(message instanceof Error ? message.message : String(message));
  },
  log() {},
  isLevelEnabled() {
    return false;
  },
  get() {
    return logger;
  },
};

const dateOf = (value) => (value ? new Date(value) : null);
const objectOf = (value) => {
  if (value == null || value === '') return {};
  if (typeof value === 'string') return JSON.parse(value);
  return value;
};

const toConcrete = (hit) => {
  const task = hit._source.task;
  return {
    id: String(hit._id).slice('task:'.length),
    version: `${hit._seq_no}:${hit._primary_term}`,
    taskType: task.taskType,
    schedule: task.schedule,
    attempts: task.attempts ?? 0,
    retryAt: dateOf(task.retryAt),
    runAt: dateOf(task.runAt),
    scheduledAt: dateOf(task.scheduledAt),
    startedAt: dateOf(task.startedAt),
    status: task.status,
    enabled: task.enabled !== false,
    state: objectOf(task.state),
    params: objectOf(task.params),
    ownerId: task.ownerId ?? null,
    partition: task.partition,
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  const id = randomUUID();
  const docId = `task:${id}`;
  let hold = Promise.resolve();
  let releaseHold = () => {};
  const armHold = () => {
    hold = new Promise((resolve) => {
      releaseHold = resolve;
    });
  };

  resetResearchExecutionClasses();
  const definitions = new TaskTypeDictionary(logger);
  definitions.registerTaskDefinitions({
    [TYPE]: {
      type: TYPE,
      title: 'Worker Core lease probe',
      timeout: '1s',
      maxAttempts: 5,
      createTaskRunner: () => ({ run: async () => ({ state: {} }) }),
    },
  });
  if (!red) {
    setResearchTaskDefinitionSource({
      get: (type) =>
        type === TYPE
          ? { type: TYPE, timeout: '1s', maxAttempts: 5, stateSchemaByVersion: {} }
          : undefined,
    });
    registerExecutionClass({
      id: 'lease-probe',
      taskTypes: (taskType) => taskType === TYPE,
      createRunner: () => ({
        run: async () => {
          console.log(JSON.stringify({ phase: 'task-enter', t: Date.now() }));
          await hold;
          throw markCollateralLoss(new Error('slot stopped'));
        },
      }),
    });
  }

  const store = {
    taskManagerId: 'wir-lease-probe',
    async msearch(searches) {
      const response = await es.msearch({
        index: INDEX,
        searches: searches.flatMap((search) => [
          {},
          {
            query: search.query,
            sort: search.sort,
            size: search.size,
            seq_no_primary_term: true,
          },
        ]),
      });
      const docs = [];
      const versionMap = new Map();
      for (const part of response.responses) {
        if (part.error) throw new Error(`msearch failed: ${JSON.stringify(part.error)}`);
        for (const hit of part.hits?.hits ?? []) {
          if (!String(hit._id).startsWith('task:')) continue;
          const concrete = toConcrete(hit);
          docs.push(concrete);
          versionMap.set(concrete.id, {
            esId: hit._id,
            seqNo: hit._seq_no,
            primaryTerm: hit._primary_term,
          });
        }
      }
      return { docs, versionMap };
    },
    async getDocVersions(esIds) {
      const response = await es.mget({ index: INDEX, ids: esIds });
      const versions = new Map();
      for (const doc of response.docs) {
        if (doc.found === false || doc._seq_no == null) continue;
        versions.set(doc._id, {
          esId: doc._id,
          seqNo: doc._seq_no,
          primaryTerm: doc._primary_term,
        });
      }
      return versions;
    },
    async bulkPartialUpdate(updates) {
      const results = [];
      for (const update of updates) {
        const current = await es.get({ index: INDEX, id: `task:${update.id}` });
        const [seq, term] = String(update.version).split(':').map(Number);
        if (current._seq_no !== seq || current._primary_term !== term) {
          results.push(
            asErr({
              id: update.id,
              type: TYPE,
              error: new Error('version conflict'),
              status: 409,
            })
          );
          continue;
        }
        results.push(asOk(await write(update.id, update, current)));
      }
      return results;
    },
    async bulkGet(ids) {
      if (!ids.length) return [];
      const response = await es.mget({
        index: INDEX,
        ids: ids.map((taskId) => `task:${taskId}`),
      });
      return response.docs.map((doc) => {
        if (doc.found === false) {
          return asErr({ id: doc._id, type: TYPE, error: new Error('missing') });
        }
        return asOk(toConcrete(doc));
      });
    },
    async partialUpdate(partial) {
      const current = await es.get({ index: INDEX, id: `task:${partial.id}` });
      return write(partial.id, partial, current);
    },
    async get(taskId) {
      const current = await es.get({ index: INDEX, id: `task:${taskId}` });
      return toConcrete(current);
    },
    async remove(taskId) {
      await es.delete({ index: INDEX, id: `task:${taskId}`, refresh: 'wait_for' });
    },
    async update(doc) {
      return this.partialUpdate(doc);
    },
  };

  const write = async (taskId, partial, current) => {
    const task = { ...current._source.task };
    for (const [key, value] of Object.entries(partial)) {
      if (key === 'id' || key === 'version') continue;
      if (value instanceof Date) task[key] = value.toISOString();
      else if ((key === 'state' || key === 'params') && value && typeof value === 'object') {
        task[key] = JSON.stringify(value);
      } else task[key] = value;
    }
    const updated = await es.update({
      index: INDEX,
      id: `task:${taskId}`,
      if_seq_no: current._seq_no,
      if_primary_term: current._primary_term,
      refresh: 'wait_for',
      doc: { task, updated_at: new Date().toISOString() },
    });
    const hit = await es.get({ index: INDEX, id: `task:${taskId}` });
    const concrete = toConcrete(hit);
    concrete.version = `${updated._seq_no}:${updated._primary_term}`;
    return concrete;
  };

  const reload = async () => {
    const hit = await es.get({ index: INDEX, id: docId });
    return hit._source.task;
  };

  const claim = () =>
    claimAvailableTasksMget({
      getCapacity: () => 20,
      claimOwnershipUntil: new Date(Date.now() + 60_000),
      batches: [],
      events$: new Subject(),
      taskStore: store,
      definitions,
      excludedTaskTypes: [],
      taskMaxAttempts: { '*': 5 },
      logger,
      taskPartitioner: {
        getPartitions: async () => [],
        getPodName: () => 'wir-lease-probe',
      },
    });

  const runnerFor = (doc) =>
    new TaskManagerRunner({
      instance: doc,
      definitions,
      logger,
      store,
      beforeRun: async (context) => context,
      defaultMaxAttempts: 5,
      executionContext: { withContext: (_context, fn) => fn() },
      config: { event_loop_delay: { monitor: false, warn_threshold: 10_000 } },
      allowReadingInvalidState: true,
      getPollInterval: () => 3000,
      apiKeyStrategy: { getApiKeyForFakeRequest: () => undefined },
      eventLogger: { logEvent() {} },
    });

  try {
    await es.deleteByQuery({
      index: INDEX,
      refresh: true,
      query: { term: { 'task.taskType': TYPE } },
    });
    const now = new Date();
    await es.index({
      index: INDEX,
      id: docId,
      refresh: 'wait_for',
      document: {
        type: 'task',
        references: [],
        managed: false,
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '10.14.0',
        updated_at: now.toISOString(),
        created_at: now.toISOString(),
        task: {
          taskType: TYPE,
          schedule: { interval: '1s' },
          params: '{}',
          state: '{}',
          attempts: 0,
          status: 'idle',
          runAt: new Date(now.getTime() - 1000).toISOString(),
          scheduledAt: now.toISOString(),
          startedAt: null,
          retryAt: null,
          enabled: true,
          ownerId: null,
        },
      },
    });

    const first = await claim();
    assert.equal(first.docs.length, 1, `claim missed the probe: ${JSON.stringify(first.stats)}`);
    assert.equal(first.docs[0].id, id);
    const claimed = await reload();
    const startedAt = new Date(claimed.startedAt).getTime();
    const retryAt = new Date(claimed.retryAt).getTime();
    console.log(
      JSON.stringify({
        phase: 'after-claim',
        status: claimed.status,
        startedAt: claimed.startedAt,
        retryAt: claimed.retryAt,
        holdMs: retryAt - startedAt,
        bootstrapMs: RESEARCH_BOOTSTRAP_DEADLINE_MS,
      })
    );
    assert.equal(claimed.status, 'running');
    assert.ok(
      retryAt > startedAt + RESEARCH_BOOTSTRAP_DEADLINE_MS,
      `retryAt hold ${retryAt - startedAt}ms is not past the ${RESEARCH_BOOTSTRAP_DEADLINE_MS}ms bootstrap`
    );

    if (red) return;

    const second = await claim();
    assert.equal(
      second.docs.some((doc) => doc.id === id),
      false,
      'a second claimer took the booting task'
    );

    armHold();
    const executionStartedAt = Date.now();
    markResearchExecutionStarted(id, executionStartedAt);
    const firstRunner = runnerFor(first.docs[0]);
    await firstRunner.markTaskAsRunning();
    const outcome = firstRunner.run();
    const grace = deriveCancelGraceMs('1s', 0);
    const expectedRetry = executionStartedAt + 1000 + grace;
    let seen;
    const deadline = Date.now() + 2500;
    while (Date.now() < deadline) {
      seen = await reload();
      if (seen.retryAt && new Date(seen.retryAt).getTime() === expectedRetry) break;
      await sleep(20);
    }
    console.log(
      JSON.stringify({
        phase: 'after-execution-start',
        retryAt: seen?.retryAt ?? null,
        expectedRetryAt: new Date(expectedRetry).toISOString(),
        capMs: RESEARCH_RECOVERY_CAP_MS,
      })
    );
    assert.equal(new Date(seen.retryAt).getTime(), expectedRetry);
    releaseHold();
    await outcome;
    const refunded = await reload();
    console.log(JSON.stringify({ phase: 'after-collateral', attempts: refunded.attempts }));
    assert.equal(refunded.attempts, 0);
    // The execution clock is once per lease. Drop it after the attempt is persisted
    // so the next claim arms a new run instead of looking already expired.
    clearResearchLease(id);

    const attempts = [];
    attempts.push(refunded.attempts);
    for (let cycle = 0; cycle < 3; cycle++) {
      console.log(JSON.stringify({ phase: 'cycle-start', cycle, t: Date.now() }));
      await sleep(1100);
      const again = await claim();
      if (again.docs.length !== 1) {
        const missed = await reload();
        console.log(JSON.stringify({ phase: 'claim-miss', cycle, task: missed, stats: again.stats }));
      }
      assert.equal(again.docs.length, 1, `recurrence ${cycle} was not claimed`);
      markResearchExecutionStarted(id, Date.now());
      hold = Promise.resolve();
      const nextRunner = runnerFor(again.docs[0]);
      await nextRunner.markTaskAsRunning();
      await nextRunner.run();
      const after = await reload();
      console.log(
        JSON.stringify({
          phase: 'cycle-after',
          cycle,
          t: Date.now(),
          attempts: after.attempts,
          status: after.status,
        })
      );
      attempts.push(after.attempts);
      clearResearchLease(id);
    }
    console.log(JSON.stringify({ phase: 'refund-cap', attempts }));
    assert.deepEqual(attempts, [0, 0, 0, 1]);
  } finally {
    releaseHold();
    await es
      .delete({ index: INDEX, id: docId, refresh: 'wait_for' })
      .catch(() => undefined);
    resetResearchExecutionClasses();
    setResearchTaskDefinitionSource(undefined);
    await es.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
