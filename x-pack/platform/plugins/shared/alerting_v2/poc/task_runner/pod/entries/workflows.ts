/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * "Stage B1": the real, unmodified `WorkflowsExecutionEnginePlugin` class (not a reimplementation)
 * registered in a pod, reusing its own `setup()`/`start()` lifecycle the same way the earlier Stage
 * A entry reused Alerting v2's real DI bind modules. `workflow:run` executes real workflow and step
 * execution documents against real, bundled `WorkflowExecutionRepository`/`StepExecutionRepository`
 * over a plain-index ES client.
 *
 * Deliberately NOT bundled / stubbed here (coupling-inventory findings, see FINDINGS.md):
 *  - connector steps: `plugins.actions` is a throwing stub, so a connector step fails with a clear
 *    error instead of silently no-op'ing — that is Stage B2's pod.
 *  - execution-log and trigger-event data streams: `core(Start).dataStreams` is a no-op fake, so
 *    step/workflow logs and the event-driven trigger log are not persisted. Nothing on the
 *    run/resume/scheduled task path *requires* them to succeed; this is a real, acknowledged gap,
 *    not a correctness fix.
 *  - licensing, cloud, usage metering, spaces: no-op/absent, matching how `plugins.*` are already
 *    optional or soft-checked in the real plugin.
 */
import 'reflect-metadata';
import { Client } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { WorkflowsExecutionEnginePlugin } from '../../../../../../../../../src/platform/plugins/shared/workflows_execution_engine/server/plugin';
import { ConsoleLogger } from '../../ports/console_logger';
import { FakeTaskManagerSetup } from '../fake_core';
import { buildSecurityStart } from '../authc';
import type { TaskRegistry } from '../server';

const buildClientOptions = () => {
  const { ES_URL, ES_API_KEY, ES_USERNAME, ES_PASSWORD } = process.env;
  if (!ES_URL) throw new Error('ES_URL is required');
  return {
    node: ES_URL,
    auth: ES_API_KEY ? { apiKey: ES_API_KEY } : { username: ES_USERNAME ?? 'elastic', password: ES_PASSWORD ?? 'changeme' },
  };
};

const CONFIG_SCHEMA = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  storage: schema.object({
    source: schema.oneOf([schema.literal('plain_index'), schema.literal('data_stream')], {
      defaultValue: 'plain_index',
    }),
    dataRetention: schema.string({ defaultValue: '90d' }),
  }),
  eventDriven: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    logEvents: schema.boolean({ defaultValue: false }),
    maxChainDepth: schema.number({ defaultValue: 10 }),
  }),
  maxWorkflowDepth: schema.number({ defaultValue: 10 }),
  logging: schema.object({ console: schema.boolean({ defaultValue: false }) }),
  maxResponseSize: schema.byteSize({ defaultValue: '1mb' }),
  eviction: schema.object({}, { unknowns: 'allow' }),
}, { unknowns: 'allow' });

/** No-op: logs/trigger-event persistence are an acknowledged Stage B1 gap, not load-bearing. */
const buildFakeDataStreams = () => ({
  registerDataStream: () => undefined,
  initializeClient: () => ({
    index: async () => {},
    bulk: async () => {},
    search: async () => ({ hits: { hits: [] } }),
  }),
});

const throwingActionsStart = new Proxy(
  {},
  {
    get() {
      throw new Error(
        'pod/entries/workflows.ts: connector execution is not bundled (Stage B2). This workflow run reached a connector step.'
      );
    },
  }
);

export const buildWorkflowsPod = (): { registry: TaskRegistry; internalClient: Client } => {
  const internalClient = new Client(buildClientOptions());
  const logger = new ConsoleLogger('plugins.workflowsExecutionEngine', (process.env.LOG_LEVEL as never) ?? 'info');
  const config = CONFIG_SCHEMA.validate({});

  const plugin = new WorkflowsExecutionEnginePlugin({
    logger: { get: () => logger } as never,
    config: { get: () => config } as never,
  } as never);

  const taskManagerSetup = new FakeTaskManagerSetup();
  const fakeCoreSetup = {
    analytics: { registerEventType: () => undefined },
    dataStreams: buildFakeDataStreams(),
    security: { serviceAccounts: { registerWorkloadType: () => undefined } },
    getStartServices: async () => [fakeCoreStart, fakePluginsStart, {}],
  };
  const fakeCoreStart = {
    elasticsearch: { client: { asInternalUser: internalClient } },
    security: buildSecurityStart(internalClient),
    dataStreams: buildFakeDataStreams(),
  };
  const fakePluginsStart = {
    licensing: { getLicense: async () => ({ isAvailable: true, isActive: true, hasAtLeast: () => true }) },
    actions: throwingActionsStart,
    taskManager: {
      schedule: async (task: unknown) => task,
      ensureScheduled: async (task: unknown) => task,
      runSoon: async () => ({ id: '' }),
      removeIfExists: async () => {},
    },
    workflowsExtensions: { getClient: async () => ({ isWorkflowsAvailable: true, emitEvent: async () => {} }) },
  };

  plugin.setup(fakeCoreSetup as never, { taskManager: taskManagerSetup } as never);
  plugin.start(fakeCoreStart as never, fakePluginsStart as never);

  const registry: TaskRegistry = new Map();
  for (const [taskType, definition] of taskManagerSetup.definitions) {
    registry.set(taskType, (ctx) => definition.createTaskRunner({ ...ctx } as never));
  }

  return { registry, internalClient };
};
