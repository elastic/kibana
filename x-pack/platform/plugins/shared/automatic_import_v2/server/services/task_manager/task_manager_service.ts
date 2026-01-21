/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import type { CoreSetup, KibanaRequest, Logger, LoggerFactory } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
  RunContext,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server/task';
import { MAX_ATTEMPTS_AI_WORKFLOWS, TASK_TIMEOUT_DURATION } from '../constants';
import { TASK_STATUSES } from '../saved_objects/constants';
import { AgentService } from '../agents/agent_service';
import { AutomaticImportSamplesIndexService } from '../samples_index/index_service';
import type { AutomaticImportV2PluginStartDependencies } from '../../types';
import type { AutomaticImportSavedObjectService } from '../saved_objects/saved_objects_service';

export const DATA_STREAM_CREATION_TASK_TYPE = 'autoImport-dataStream-task';

export interface DataStreamTaskParams extends DataStreamParams {
  /**
   * Inference connector ID to use when the background task runs.
   */
  connectorId: string;
}

export interface DataStreamParams {
  integrationId: string;
  dataStreamId: string;
}

export class TaskManagerService {
  private logger: Logger;
  private taskManager: TaskManagerStartContract | null = null;
  private agentService: AgentService;
  private automaticImportSavedObjectService: AutomaticImportSavedObjectService | null = null;

  constructor(
    logger: LoggerFactory,
    taskManagerSetup: TaskManagerSetupContract,
    core: CoreSetup<AutomaticImportV2PluginStartDependencies>
  ) {
    this.logger = logger.get('taskManagerService');
    this.agentService = new AgentService(new AutomaticImportSamplesIndexService(logger), logger);
    // Register task definitions during setup phase
    taskManagerSetup.registerTaskDefinitions({
      [DATA_STREAM_CREATION_TASK_TYPE]: {
        title: 'Data Stream generation workflow',
        description: 'Executes long-running AI agent workflows for data stream generation',
        timeout: TASK_TIMEOUT_DURATION,
        maxAttempts: MAX_ATTEMPTS_AI_WORKFLOWS,
        cost: TaskCost.Normal,
        priority: TaskPriority.Normal,
        createTaskRunner: ({ taskInstance, fakeRequest }: RunContext) => ({
          run: async () => {
            assert(
              this.automaticImportSavedObjectService,
              'Automatic import saved object service not initialized'
            );
            return this.runTask(
              taskInstance,
              core,
              this.automaticImportSavedObjectService,
              fakeRequest as KibanaRequest
            );
          },
          cancel: async () => this.cancelTask(taskInstance),
        }),
      },
    });

    this.logger.debug(`Task definition "${DATA_STREAM_CREATION_TASK_TYPE}" registered`);
  }

  // for lifecycle start phase
  public initialize(
    taskManager: TaskManagerStartContract,
    automaticImportSavedObjectService: AutomaticImportSavedObjectService
  ): void {
    this.taskManager = taskManager;
    this.automaticImportSavedObjectService = automaticImportSavedObjectService;
    this.logger.info('Automatic Import TaskManagerService initialized');
  }

  public async scheduleDataStreamCreationTask(
    params: DataStreamTaskParams,
    request: KibanaRequest
  ): Promise<{ taskId: string }> {
    assert(this.taskManager, 'TaskManager not initialized');

    const taskId = this.generateDataStreamTaskId({
      integrationId: params.integrationId,
      dataStreamId: params.dataStreamId,
    });

    try {
      const taskInstance = await this.taskManager.schedule(
        {
          id: taskId,
          taskType: DATA_STREAM_CREATION_TASK_TYPE,
          params,
          state: { task_status: TASK_STATUSES.pending },
          scope: ['automaticImport'],
        },
        { request }
      );

      this.logger.debug(`Task scheduled: ${taskInstance.id}`);
      return { taskId: taskInstance.id };
    } catch (error: any) {
      // If task already exists (version conflict), return the existing task ID
      if (error.statusCode === 409 || error.message?.includes('version conflict')) {
        this.logger.debug(`Task ${taskId} already exists, returning existing task ID`);
        try {
          const existingTask = await this.taskManager.get(taskId);
          return { taskId: existingTask.id };
        } catch (getError) {
          // If we can't get the task, re-throw the original error
          this.logger.error(`Failed to get existing task ${taskId}:`, getError);
          throw error;
        }
      }
      // Re-throw other errors
      throw error;
    }
  }

  public async removeDataStreamCreationTask(dataStreamParams: DataStreamParams): Promise<void> {
    assert(this.taskManager, 'TaskManager not initialized');
    const taskId = this.generateDataStreamTaskId(dataStreamParams);
    try {
      await this.taskManager.removeIfExists(taskId);
      this.logger.debug(`Task deleted: ${taskId}`);
    } catch (error) {
      this.logger.error(`Failed to remove task ${taskId}:`, error);
    }
  }

  public async getTaskStatus(taskId: string): Promise<{
    task_status: keyof typeof TASK_STATUSES;
  }> {
    if (!this.taskManager) {
      throw new Error('TaskManager not initialized');
    }

    try {
      const task = await this.taskManager.get(taskId);

      return {
        task_status: task.state?.task_status,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get task status for ${taskId}:`, error);
      throw new Error(`Task ${taskId} not found or inaccessible`);
    }
  }

  private async runTask(
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup<AutomaticImportV2PluginStartDependencies>,
    automaticImportSavedObjectService: AutomaticImportSavedObjectService,
    request: KibanaRequest
  ) {
    assert(this.agentService, 'Agent service not initialized');
    assert(
      automaticImportSavedObjectService,
      'Automatic import saved object service not initialized'
    );

    const { id: taskId, params } = taskInstance;
    const { integrationId, dataStreamId, connectorId } = params as DataStreamTaskParams;

    this.logger.debug(
      `Running task ${taskId} with ${JSON.stringify({ integrationId, dataStreamId, connectorId })}`
    );

    try {
      if (!integrationId || !dataStreamId || !connectorId) {
        throw new Error('Task params must include integrationId, dataStreamId, and connectorId');
      }

      // Get core services and plugins
      const [coreStart, pluginsStart] = await core.getStartServices();

      const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
      const esClient = scopedClusterClient.asCurrentUser;

      const model = await pluginsStart.inference.getChatModel({
        request,
        connectorId,
        chatModelOptions: {
          temperature: 0.05,
          // Prevent long internal retries; Task Manager handles retries at task level
          maxRetries: 1,
          disableStreaming: true,
          maxConcurrency: 50,
          telemetryMetadata: { pluginId: 'automatic_import_v2' },
        },
      });

      const result = await this.agentService.invokeAutomaticImportAgent(
        integrationId,
        dataStreamId,
        esClient,
        model
      );

      this.logger.debug(`Task ${taskId} completed successfully`);

      // Extract and convert the pipeline to JSON string
      const pipelineString = JSON.stringify(result.current_pipeline || {});

      // Extract docs from pipeline_generation_results and convert to string array
      const pipelineGenerationResults = (result.pipeline_generation_results?.docs || []).map(
        (doc) => JSON.stringify(doc)
      );

      // Update the data stream saved object with pipeline and task status
      await automaticImportSavedObjectService.updateDataStreamSavedObjectAttributes({
        integrationId,
        dataStreamId,
        ingestPipeline: pipelineString,
        status: TASK_STATUSES.completed,
      });

      this.logger.debug(`Data stream ${dataStreamId} updated successfully`);
      this.logger.debug(`Task ${taskId} result: ${JSON.stringify(result)}`);

      return {
        state: {
          task_status: TASK_STATUSES.completed,
          result: {
            ingest_pipeline: pipelineString,
            pipeline_generation_results: pipelineGenerationResults,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Task ${taskId} failed: ${JSON.stringify(error)}`);
      return { state: { task_status: TASK_STATUSES.failed }, error };
    }
  }

  private async cancelTask(taskInstance: ConcreteTaskInstance) {
    // Cancel the AI task here
    this.logger.debug(`Cancelling task ${taskInstance.id}`);
    return { state: { task_status: TASK_STATUSES.cancelled } };
  }

  private generateDataStreamTaskId(params: DataStreamParams): string {
    return `data-stream-task-${params.integrationId}-${params.dataStreamId}`;
  }
}
