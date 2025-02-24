/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClient } from '@kbn/core/server';
import type { CoreSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LoggerFactory } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import { SO_SEARCH_LIMIT, outputType } from '../../common/constants';
import type { NewRemoteElasticsearchOutput } from '../../common/types';

import { appContextService, outputService } from '../services';
import { getInstalledPackageSavedObjects } from '../services/epm/packages/get';
import { FLEET_SYNCED_INTEGRATIONS_INDEX_NAME } from '../services/setup/fleet_synced_integrations';

export const TYPE = 'fleet:sync-integrations-task';
export const VERSION = '1.0.0';
const TITLE = 'Fleet Sync Integrations Task';
const SCOPE = ['fleet'];
const INTERVAL = '5m';
const TIMEOUT = '1m';

interface SyncIntegrationsTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
}

interface SyncIntegrationsTaskStartContract {
  taskManager: TaskManagerStartContract;
}

interface SyncIntegrationsData {
  remote_es_hosts: Array<{
    name: string;
    hosts: string[];
    sync_integrations: boolean;
  }>;
  integrations: Array<{
    package_name: string;
    package_version: string;
    updated_at: string;
  }>;
}

export class SyncIntegrationsTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private abortController = new AbortController();

  constructor(setupContract: SyncIntegrationsTaskSetupContract) {
    const { core, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },
            cancel: async () => {
              this.abortController.abort('Task cancelled');
            },
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: SyncIntegrationsTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('[SyncIntegrationsTask] Missing required service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(`[SyncIntegrationsTask] Started with interval of [${INTERVAL}]`);

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: INTERVAL,
        },
        state: {},
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task SyncIntegrationsTask, error: ${e.message}`, e);
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  private endRun(msg: string = '') {
    this.logger.info(`[SyncIntegrationsTask] runTask ended${msg ? ': ' + msg : ''}`);
  }

  public runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    if (!this.wasStarted) {
      this.logger.debug('[SyncIntegrationsTask] runTask Aborted. Task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `[SyncIntegrationsTask] Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.info(`[runTask()] started`);

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

    const { enableSyncIntegrationsOnRemote } = appContextService.getExperimentalFeatures();

    if (!enableSyncIntegrationsOnRemote) {
      return;
    }

    const indexExists = await esClient.indices.exists(
      {
        index: FLEET_SYNCED_INTEGRATIONS_INDEX_NAME,
      },
      { signal: this.abortController.signal }
    );

    if (!indexExists) {
      this.logger.info(
        `[SyncIntegrationsTask] index ${FLEET_SYNCED_INTEGRATIONS_INDEX_NAME} does not exist`
      );
      return;
    }

    try {
      await this.updateSyncedIntegrationsData(esClient, soClient);

      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`[SyncIntegrationsTask] request aborted due to timeout: ${err}`);
        this.endRun();
        return;
      }
      this.logger.error(`[SyncIntegrationsTask] error: ${err}`);
      this.endRun('error');
    }
  };

  private updateSyncedIntegrationsData = async (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClient
  ) => {
    const outputs = await outputService.list(soClient);
    const remoteESOutputs = outputs.items.filter(
      (output) => output.type === outputType.RemoteElasticsearch
    );
    const isSyncEnabled = remoteESOutputs.some(
      (output) => (output as NewRemoteElasticsearchOutput).sync_integrations
    );

    if (!isSyncEnabled) {
      return;
    }

    const newDoc: SyncIntegrationsData = {
      remote_es_hosts: remoteESOutputs.map((output) => {
        const remoteOutput = output as NewRemoteElasticsearchOutput;
        return {
          name: remoteOutput.name,
          hosts: remoteOutput.hosts ?? [],
          sync_integrations: remoteOutput.sync_integrations ?? false,
        };
      }),
      integrations: [],
    };

    const packageSavedObjects = await getInstalledPackageSavedObjects(soClient, {
      perPage: SO_SEARCH_LIMIT,
      sortOrder: 'asc',
    });
    newDoc.integrations = packageSavedObjects.saved_objects.map((item) => {
      return {
        package_name: item.attributes.name,
        package_version: item.attributes.version,
        updated_at: item.updated_at ?? new Date().toISOString(),
      };
    });

    await esClient.update(
      {
        id: FLEET_SYNCED_INTEGRATIONS_INDEX_NAME,
        index: FLEET_SYNCED_INTEGRATIONS_INDEX_NAME,
        body: {
          doc: newDoc,
          doc_as_upsert: true,
        },
      },
      { signal: this.abortController.signal }
    );
  };
}
