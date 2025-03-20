/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy } from 'lodash';
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

import { SO_SEARCH_LIMIT, outputType } from '../../../common/constants';
import type { NewRemoteElasticsearchOutput } from '../../../common/types';

import { appContextService, outputService } from '../../services';
import { getInstalledPackageSavedObjects } from '../../services/epm/packages/get';
import { FLEET_SYNCED_INTEGRATIONS_INDEX_NAME } from '../../services/setup/fleet_synced_integrations';

import { syncIntegrationsOnRemote } from './sync_integrations_on_remote';
import { getCustomAssets } from './custom_assets';
import type { SyncIntegrationsData } from './model';

export const TYPE = 'fleet:sync-integrations-task';
export const VERSION = '1.0.2';
const TITLE = 'Fleet Sync Integrations Task';
const SCOPE = ['fleet'];
const INTERVAL = '5m';
const TIMEOUT = '5m';

interface SyncIntegrationsTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
}

interface SyncIntegrationsTaskStartContract {
  taskManager: TaskManagerStartContract;
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

    const [coreStart, _startDeps, { packageService }] = (await core.getStartServices()) as any;
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

    const { enableSyncIntegrationsOnRemote } = appContextService.getExperimentalFeatures();

    if (!enableSyncIntegrationsOnRemote) {
      return;
    }

    try {
      // write integrations on main cluster
      await this.updateSyncedIntegrationsData(esClient, soClient);

      // sync integrations on remote cluster
      await syncIntegrationsOnRemote(
        esClient,
        soClient,
        packageService.asInternalUser,
        this.abortController,
        this.logger
      );

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

  private syncedIntegrationsIndexExists = async (esClient: ElasticsearchClient) => {
    return await esClient.indices.exists(
      {
        index: FLEET_SYNCED_INTEGRATIONS_INDEX_NAME,
      },
      { signal: this.abortController.signal }
    );
  };

  private getSyncedIntegrationDoc = async (
    esClient: ElasticsearchClient
  ): Promise<SyncIntegrationsData | undefined> => {
    try {
      const res = await esClient.get({
        id: FLEET_SYNCED_INTEGRATIONS_INDEX_NAME,
        index: FLEET_SYNCED_INTEGRATIONS_INDEX_NAME,
      });
      return res._source as SyncIntegrationsData;
    } catch (error) {
      if (error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  };

  private hadAnyRemoteESSyncEnabled = (
    remoteEsHosts: SyncIntegrationsData['remote_es_hosts']
  ): boolean => {
    return remoteEsHosts.some((host) => host.sync_integrations);
  };

  private updateSyncedIntegrationsData = async (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClient
  ) => {
    const indexExists = await this.syncedIntegrationsIndexExists(esClient);

    if (!indexExists) {
      this.logger.info(
        `[SyncIntegrationsTask] index ${FLEET_SYNCED_INTEGRATIONS_INDEX_NAME} does not exist`
      );
      return;
    }

    const outputs = await outputService.list(soClient);
    const remoteESOutputs = outputs.items.filter(
      (output) => output.type === outputType.RemoteElasticsearch
    );
    const isSyncEnabled = remoteESOutputs.some(
      (output) => (output as NewRemoteElasticsearchOutput).sync_integrations
    );

    const previousSyncIntegrationsData = await this.getSyncedIntegrationDoc(esClient);

    if (!isSyncEnabled) {
      const hadAnyRemoteESSyncEnabled =
        previousSyncIntegrationsData &&
        this.hadAnyRemoteESSyncEnabled(previousSyncIntegrationsData.remote_es_hosts);
      if (!hadAnyRemoteESSyncEnabled) {
        return;
      }
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
      custom_assets: {},
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

    try {
      const customAssets = await getCustomAssets(
        esClient,
        newDoc.integrations,
        this.abortController,
        previousSyncIntegrationsData
      );
      newDoc.custom_assets = keyBy(customAssets, (asset) => `${asset.type}:${asset.name}`);
    } catch (error) {
      this.logger.warn(`[SyncIntegrationsTask] error getting custom assets: ${error}`);
      newDoc.custom_assets_error = {
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }

    await esClient.index(
      {
        id: FLEET_SYNCED_INTEGRATIONS_INDEX_NAME,
        index: FLEET_SYNCED_INTEGRATIONS_INDEX_NAME,
        body: newDoc,
      },
      { signal: this.abortController.signal }
    );
  };
}
