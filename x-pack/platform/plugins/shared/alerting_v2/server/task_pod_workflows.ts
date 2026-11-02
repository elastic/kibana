/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import { definePodPlugin, podContract } from '@kbn/task-manager-plugin/server/task_pod';
import { WorkflowRepository } from '@kbn/workflows';
import { config as engineConfig } from '@kbn/workflows-execution-engine/server/config';
import { ConcurrencyManager } from '@kbn/workflows-execution-engine/server/concurrency/concurrency_manager';
import { createDataClientBundle } from '@kbn/workflows-execution-engine/server/repositories/data_access_layer';
import { StepExecutionRepository } from '@kbn/workflows-execution-engine/server/repositories/step_execution_repository';
import { WorkflowExecutionRepository } from '@kbn/workflows-execution-engine/server/repositories/workflow_execution_repository';
import {
  createBulkScheduleWorkflow,
  createScheduleWorkflow,
  createSchedulingHelpers,
} from '@kbn/workflows-execution-engine/server/scheduling';
import type { SchedulingDeps } from '@kbn/workflows-execution-engine/server/scheduling';
import { TriggerEventHandler } from '@kbn/workflows-execution-engine/server/trigger_events/trigger_event_handler';
import { WorkflowTaskManager } from '@kbn/workflows-execution-engine/server/workflow_task_manager/workflow_task_manager';
import { TriggerRegistry } from '@kbn/workflows-extensions/server/trigger_registry';
import { getWorkflowsByIdsForRequests } from '@kbn/workflows-management-plugin/server/api/lib/get_workflows_by_ids_for_requests';
import { getWorkflowsByIds } from '@kbn/workflows-management-plugin/server/services/get_workflows_by_ids';
import { WorkflowAccessControlService } from '@kbn/workflows-management-plugin/server/services/workflow_access_control';
import { createStorage } from '@kbn/workflows-management-plugin/server/storage/workflow_storage';

/**
 * The slice of the pod's config the workflows code reads, with kibana.yml's own keys:
 * `xpack.workflowsExecutionEngine.*` and `xpack.workflowsManagement.available`.
 */
const configSchema = schema.object(
  {
    workflowsExecutionEngine: engineConfig.schema,
    workflowsManagement: schema.object(
      { available: schema.boolean({ defaultValue: true }) },
      { unknowns: 'allow' }
    ),
  },
  { unknowns: 'allow' }
);

type RuntimeConfig = ReturnType<typeof configSchema.validate>;

/** What a request needs from a workflows call: who scheduled it, as a pod request. */
interface BulkScheduleItem {
  workflow: { id: string } & Record<string, unknown>;
  spaceId: string;
  inputs: Record<string, unknown>;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Everything the alerting v2 tasks need from workflows, running in the pod: trigger events are
 * matched against workflows in Elasticsearch and scheduled (executions written, a `workflow:run`
 * task created through the pod's own Task Manager scheduling), and workflows are looked up and
 * bulk scheduled for the dispatcher. It is the same code Kibana runs, built from its parts rather
 * than by booting the workflows plugins; only the storage (`plain_index`) and the default
 * trigger events setup are supported.
 */
interface WorkflowsRuntime {
  isWorkflowsAvailable: () => Promise<boolean>;
  emitEvent: (request: KibanaRequest, triggerId: string, payload: unknown) => Promise<void>;
  getWorkflowsByIdsForRequests: (lookups: never) => Promise<unknown>;
  bulkScheduleWorkflow: (items: BulkScheduleItem[], request: KibanaRequest) => Promise<unknown>;
}

// Trigger definitions are registered at setup (by the alerting v2 runtime) and read at start.
const triggerRegistry = new TriggerRegistry();
let runtime: WorkflowsRuntime | undefined;

const getRuntime = () => {
  if (!runtime) throw new Error('The workflows runtime is not started in this pod');
  return runtime;
};

const createRuntime = async ({
  core,
  licensing,
  taskManager,
  spaces,
  config,
  logger,
}: {
  core: any;
  licensing: { getLicense: () => Promise<{ hasAtLeast: (level: 'enterprise') => boolean }> };
  taskManager: unknown;
  spaces: { spacesService: unknown };
  config: RuntimeConfig;
  logger: any;
}): Promise<WorkflowsRuntime> => {
  const { storage, eventDriven } = config.workflowsExecutionEngine;
  if (storage.source !== 'plain_index') {
    throw new Error(
      `xpack.workflowsExecutionEngine.storage.source '${storage.source}' is not supported in a task pod: use 'plain_index'`
    );
  }
  const esClient = core.elasticsearch.client.asInternalUser;

  const dataClientBundle = createDataClientBundle({
    source: storage.source,
    dataRetention: storage.dataRetention,
    logger,
  });
  await dataClientBundle.initSetup({} as never);
  await dataClientBundle.initStart(core);
  const workflowExecutionRepository = new WorkflowExecutionRepository(
    dataClientBundle.createWorkflowDataClient()
  );
  const stepExecutionRepository = new StepExecutionRepository(
    dataClientBundle.createStepDataClient()
  );
  const workflowRepository = new WorkflowRepository({ esClient, logger });
  const workflowTaskManager = new WorkflowTaskManager(taskManager as never);

  const schedulingDeps: SchedulingDeps = {
    coreStart: core,
    licensing: licensing as never,
    taskManager: taskManager as never,
    cloudSetup: undefined,
    config: { eventDriven },
    logger,
    workflowRepository,
    workflowExecutionRepository,
    stepExecutionRepository,
    workflowTaskManager,
    concurrencyManager: new ConcurrencyManager(workflowTaskManager, workflowExecutionRepository),
    // Resuming a parent workflow is the engine's job, on the node that claims the task.
    getInternalResumeWorkflowExecution: () => undefined,
  };
  const helpers = createSchedulingHelpers(schedulingDeps);
  const scheduleWorkflow = createScheduleWorkflow(schedulingDeps, helpers);
  const bulkScheduleWorkflow = createBulkScheduleWorkflow(schedulingDeps, helpers);

  const triggerEventHandler = new TriggerEventHandler({
    workflowExecutionRepository,
    coreStart: core,
    workflowRepository,
    workflowsExtensions: { getTriggerDefinition: (id: string) => triggerRegistry.get(id) } as never,
    spaces: spaces.spacesService as never,
    scheduleWorkflow,
    logger,
    config: eventDriven,
    // Trigger events are logged to a data stream that only Kibana sets up.
    triggerEventsClientPromise: Promise.resolve(undefined),
  });

  const accessControl = new WorkflowAccessControlService(core, {} as never, undefined);
  const workflowStorage = createStorage({ logger, esClient });

  return {
    isWorkflowsAvailable: async () =>
      config.workflowsManagement.available &&
      (await licensing.getLicense()).hasAtLeast('enterprise'),
    emitEvent: async (request, triggerId, payload) => {
      await triggerEventHandler.handleEvent({ triggerId, payload, request } as never);
    },
    getWorkflowsByIdsForRequests: (lookups) =>
      getWorkflowsByIdsForRequests(
        {
          getWorkflowsByIds: (ids, spaceId) => getWorkflowsByIds(workflowStorage, ids, spaceId),
          getAccessControl: async () => accessControl,
        },
        lookups
      ),
    bulkScheduleWorkflow: (items, request) => {
      // Same mapping as the management API's `bulkScheduleWorkflow` (workflows that delegate their
      // identity to a parent can't be run standalone).
      const results: unknown[] = new Array(items.length);
      const forwarded: number[] = [];
      const engineItems = items.flatMap((item, index) => {
        if ((item.workflow as { requiresDelegatedIdentity?: boolean }).requiresDelegatedIdentity) {
          results[index] = {
            status: 'error',
            error: {
              message: `Workflow '${item.workflow.id}' delegates its execution identity to a parent workflow and cannot be run standalone.`,
            },
          };
          return [];
        }
        forwarded.push(index);
        const { event, ...manualInputs } = item.inputs;
        return [
          {
            workflow: item.workflow,
            context: {
              event,
              spaceId: item.spaceId,
              inputs: manualInputs,
              triggeredBy: item.triggeredBy,
              ...(item.metadata ? { metadata: item.metadata } : {}),
            },
          },
        ];
      });
      return bulkScheduleWorkflow(engineItems as never, request).then((engineResults) => {
        forwarded.forEach((itemIndex, resultIndex) => {
          results[itemIndex] = (engineResults as unknown[])[resultIndex];
        });
        return results;
      });
    },
  };
};

/**
 * `workflowsExtensions`, `workflowsManagement` and the runtime behind them, as pod plugins. They
 * stand in for the real plugins for the members alerting v2's tasks use; anything else throws.
 */
export const workflowsPodPlugins = [
  definePodPlugin({
    id: 'workflowsRuntime',
    configPath: ['xpack'],
    configSchema,
    requiredPlugins: ['taskManager', 'licensing', 'spaces'],
    start: async (core, { taskManager, licensing, spaces }, context) => {
      runtime = await createRuntime({
        core,
        licensing,
        taskManager,
        spaces,
        config: context.config.get<RuntimeConfig>(),
        logger: context.logger.get('workflows'),
      });
      return {};
    },
  }),
  definePodPlugin({
    id: 'workflowsExtensions',
    requiredPlugins: ['workflowsRuntime'],
    setup: () => ({
      registerTriggerDefinition: (definition: never) => triggerRegistry.register(definition),
      // Step, UI and managed-workflow registration belongs to Kibana: tasks don't need it.
      registerStepDefinition: () => undefined,
      registerManagedWorkflowOwner: () => undefined,
    }),
    start: () => {
      triggerRegistry.freeze();
      return podContract('workflowsExtensions', {
        getClient: async (request: KibanaRequest) => ({
          isWorkflowsAvailable: await getRuntime().isWorkflowsAvailable(),
          emitEvent: (triggerId: string, payload: unknown) =>
            getRuntime().emitEvent(request, triggerId, payload),
        }),
      });
    },
  }),
  definePodPlugin({
    id: 'workflowsManagement',
    requiredPlugins: ['workflowsRuntime'],
    setup: () => ({
      management: podContract('workflowsManagement.management', {
        getWorkflowsByIdsForRequests: (lookups: never) =>
          getRuntime().getWorkflowsByIdsForRequests(lookups),
        getClient: (request: KibanaRequest) =>
          podContract('workflowsManagement.client', {
            bulkScheduleWorkflow: (items: BulkScheduleItem[]) =>
              getRuntime().bulkScheduleWorkflow(items, request),
          }),
      }),
    }),
  }),
];
