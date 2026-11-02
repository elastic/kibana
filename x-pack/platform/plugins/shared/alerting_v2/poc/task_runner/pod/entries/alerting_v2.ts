/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * "Stage A": registers the real Alerting v2 task definitions (fetch rule, run pipeline, forward
 * workflow events) in a pod process, using the plugin's own `bindServices` / `bindEvents` /
 * `bindArtifactTypes` / `bindRuleExecutionServices` / `bindTasks` DI modules verbatim — no
 * executor source file is edited, and `FetchRuleStep` reads the rule through the real
 * `RulesClient` over a Saved Objects repository bundled into this process (`pod/so_repository.ts`).
 *
 * What is deliberately NOT bundled here (see FINDINGS.md "Generalizing" section):
 *  - the Workflows engine that would actually run a forwarded trigger (that's Stage B's pod);
 *    `workflowsExtensions.getClient().emitEvent` is a capturing stub that records what would have
 *    been forwarded, so this pod still proves the call site runs in-process end to end.
 *  - connector execution, maintenance windows, change history, license, EBT, UI settings, feature
 *    privileges and Agent Builder wiring: bound as no-op/throwing stubs because nothing on the
 *    rule-fetch-and-execute path touches them. A task that did would need them ported too.
 */

import 'reflect-metadata';
import { Container, ContainerModule } from 'inversify';
import { of } from 'rxjs';
import { Client } from '@elastic/elasticsearch';
import { Logger as BaseLogger, OnSetup, OnStart, PluginSetup, PluginStart } from '@kbn/core-di';
import { CoreStart, PluginInitializer, SavedObjectsClientFactory } from '@kbn/core-di-server';

import { bindServices } from '../../../../server/setup/bind_services';
import { bindEvents } from '../../../../server/setup/bind_events';
import { bindArtifactTypes } from '../../../../server/setup/bind_artifact_types';
import { bindRuleExecutionServices } from '../../../../server/setup/bind_rule_executor';
import { bindTasks } from '../../../../server/setup/bind_tasks';
import { TaskDefinition } from '../../../../server/lib/services/task_run_scope_service/create_task_runner';
import { RuleExecutorWorkflowSubscriber } from '../../../../server/lib/events/rule_executor_workflow_subscriber/rule_executor_workflow_subscriber';
import { registerSavedObjects } from '../../../../server/saved_objects';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { ConsoleLogger } from '../../ports/console_logger';
import { DEFAULT_PLUGIN_CONFIG } from '../../ports/plugin_config';
import {
  FakeTaskManagerSetup,
  FakeSavedObjectsServiceSetup,
  FakeEncryptedSavedObjectsSetup,
} from '../fake_core';
import { buildSavedObjectsRepository } from '../so_repository';
import { buildFakeRequest } from '../fake_request';
import { buildSecurityStart, buildUserProfileStart } from '../authc';
import { buildTaskManagerStore } from '../task_manager_store';
import { WORKFLOW_RUN_TASK_TYPE } from '../../../../../../../../../src/platform/plugins/shared/workflows_execution_engine/server/workflow_task_manager/types';
import type { TaskRegistry } from '../server';

const ALERTING_CASES_INDEX = '.kibana_alerting_cases';

/** Forwarded workflow trigger events, captured instead of executed by a real Workflows engine. */
export const capturedWorkflowTriggers: Array<{ triggerId: string; payload: unknown }> = [];

const buildClientOptions = () => {
  const { ES_URL, ES_API_KEY, ES_USERNAME, ES_PASSWORD } = process.env;
  if (!ES_URL) throw new Error('ES_URL is required');
  return {
    node: ES_URL,
    auth: ES_API_KEY ? { apiKey: ES_API_KEY } : { username: ES_USERNAME ?? 'elastic', password: ES_PASSWORD ?? 'changeme' },
  };
};

/**
 * Builds the pod-wide plugin container: calls the real DI bind modules, then fakes exactly the
 * Core/plugin tokens the rule-fetch-and-execute path dereferences.
 */
export const buildAlertingV2Pod = (): { registry: TaskRegistry; internalClient: Client } => {
  const internalClient = new Client(buildClientOptions());
  const logger = new ConsoleLogger('plugins.alertingVTwo', (process.env.LOG_LEVEL as never) ?? 'info');

  const soSetup = new FakeSavedObjectsServiceSetup();
  const esoSetup = new FakeEncryptedSavedObjectsSetup();
  // The plugin's own registration code decides the mappings/model versions; the pod only supplies
  // the capture target.
  registerSavedObjects({
    savedObjects: soSetup as never,
    encryptedSavedObjects: esoSetup as never,
    logger: logger as never,
  });

  const soRepository = buildSavedObjectsRepository({
    client: internalClient,
    indexName: ALERTING_CASES_INDEX,
    soTypes: [...soSetup.types.values()],
    logger: logger as never,
    includedHiddenTypes: [...soSetup.types.keys()],
  });

  const root = new Container();

  root.bind(BaseLogger).toConstantValue(logger);
  root.bind(PluginInitializer('config')).toConstantValue({ get: () => DEFAULT_PLUGIN_CONFIG });
  root.bind(CoreStart('savedObjects')).toConstantValue({
    createInternalRepository: () => soRepository,
  } as never);
  root.bind(SavedObjectsClientFactory).toConstantValue(() => soRepository);
  // Real identity resolution over ES `_security/_authenticate`, not a stub — see pod/authc.ts.
  root.bind(CoreStart('userProfile')).toConstantValue(buildUserProfileStart(internalClient) as never);
  root.bind(CoreStart('security')).toConstantValue(buildSecurityStart(internalClient) as never);
  root.bind(CoreStart('featureFlags')).toConstantValue({
    getStringValue$: (_flag: string, fallback: string) => of(fallback),
  } as never);
  root.bind(CoreStart('elasticsearch')).toConstantValue({
    client: {
      asInternalUser: internalClient,
      // `projectRouting` is accepted and ignored: cross-project search routing is a documented gap.
      asScoped: (request: { headers?: Record<string, string> }) => ({
        asCurrentUser: internalClient.child({
          headers: { authorization: request.headers?.authorization },
        }),
      }),
    },
  } as never);
  // Real `spacesService.getSpaceId`/`spaceIdToNamespace` logic (ported, not reimplemented): reads
  // the real `KibanaRequest.spaceId` field (set from `FakeRawRequest.spaceId` by `buildFakeRequest`)
  // and converts with the same `SavedObjectsUtils` namespace helpers the Spaces plugin itself uses.
  root.bind(PluginStart('spaces')).toConstantValue({
    spacesService: {
      getSpaceId: (request: { spaceId?: string }) => request.spaceId ?? 'default',
      spaceIdToNamespace: (spaceId: string) => SavedObjectsUtils.namespaceStringToId(spaceId),
      namespaceToSpaceId: (namespace?: string) => SavedObjectsUtils.namespaceIdToString(namespace),
    },
  } as never);
  root.bind(PluginStart('taskManager')).toConstantValue({
    removeIfExists: async () => {},
    runSoon: async () => ({ id: '' }),
    bulkRemove: async () => ({ statuses: [] }),
    bulkUpdateSchedules: async () => ({ tasks: [], errors: [] }),
    bulkGet: async () => [],
  } as never);
  // Bundled "Task Manager store": writes a real `task` saved object for the forwarded trigger
  // directly (see pod/task_manager_store.ts). Nothing in this pod claims or runs it — actually
  // executing a workflow run is Stage B's separate pod — so `emitEvent` both captures the trigger
  // (for the smoke-test assertion) and proves the scheduling write happens in-process.
  const taskManagerStore = buildTaskManagerStore({ client: internalClient, logger: logger as never });
  root.bind(PluginStart('workflowsExtensions')).toConstantValue({
    getClient: async () => ({
      isWorkflowsAvailable: true,
      emitEvent: async (triggerId: string, payload: unknown) => {
        capturedWorkflowTriggers.push({ triggerId, payload });
        const workflowRunId = `pod-forwarded-${triggerId}-${Date.now()}`;
        await taskManagerStore.schedule({
          id: `workflow:${workflowRunId}:${triggerId}`,
          taskType: WORKFLOW_RUN_TASK_TYPE,
          params: { workflowRunId, spaceId: 'default', triggerId, payload },
          scope: ['alertingV2'],
        });
      },
    }),
  } as never);

  const taskManagerSetup = new FakeTaskManagerSetup();
  root.bind(PluginSetup('taskManager')).toConstantValue(taskManagerSetup as never);
  root.bind(PluginSetup('encryptedSavedObjects')).toConstantValue(esoSetup as never);

  root.load(new ContainerModule((options) => bindServices(options)));
  root.load(new ContainerModule((options) => bindEvents(options)));
  root.load(new ContainerModule((options) => bindArtifactTypes(options)));
  root.load(new ContainerModule((options) => bindRuleExecutionServices(options)));
  root.load(new ContainerModule((options) => bindTasks(options)));

  // `CoreStart('injection')` backs `bindServices`'s own `TaskRunnerFactoryToken`: each run forks a
  // child container off `root` and binds the run's `fakeRequest` onto it as `Request`.
  root.bind(CoreStart('injection')).toConstantValue({
    fork: () => new Container({ parent: root }),
  } as never);

  for (const onSetup of root.getAll(OnSetup)) onSetup(root);
  for (const onStart of root.getAll(OnStart)) onStart(root);

  // Only the rule-executor forwarding subscriber: the rule-lifecycle, alert-action, change-history
  // and telemetry subscribers are out of scope for the rule-fetch-and-execute path this pod proves.
  root.get(RuleExecutorWorkflowSubscriber).start();

  const registry: TaskRegistry = new Map();
  for (const [taskType, definition] of taskManagerSetup.definitions) {
    registry.set(taskType, (ctx) => {
      const request = ctx.apiKey ? buildFakeRequest({ apiKey: ctx.apiKey, spaceId: ctx.spaceId }) : undefined;
      return definition.createTaskRunner({ ...ctx, fakeRequest: request });
    });
  }

  return { registry, internalClient };
};
