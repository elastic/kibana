/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';
import {
  type CoreSetup,
  type ElasticsearchClient,
  type Logger,
  SavedObjectsClient,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LoggerFactory } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';

import type { DiscoveryField } from '../../common/types';

import type { PackageClient } from '../services';
import { appContextService } from '../services';
import * as Registry from '../services/epm/registry';

import { MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS } from '../constants';

export const TYPE = 'fleet:auto-install-content-packages-task';
export const VERSION = '0.0.3'; // TODO 1.0.0
const TITLE = 'Fleet Auto Install Content Packages Task';
const SCOPE = ['fleet'];
const DEFAULT_INTERVAL = '1m'; // TODO 10m
const TIMEOUT = '1m';
const CONTENT_PACKAGES_CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface AutoInstallContentPackagesTaskConfig {
  taskInterval?: string;
}

interface AutoInstallContentPackagesTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
  config: AutoInstallContentPackagesTaskConfig;
}

interface AutoInstallContentPackagesTaskStartContract {
  taskManager: TaskManagerStartContract;
}

interface DiscoveryMap {
  [key: string]: {
    packages: Array<{ name: string; version: string }>;
    field: { name: string; value: string | number | boolean };
  };
}

export class AutoInstallContentPackagesTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private abortController?: AbortController;
  private taskInterval: string;
  private discoveryMap?: DiscoveryMap;
  private discoveryMapLastFetched: number = 0;

  constructor(setupContract: AutoInstallContentPackagesTaskSetupContract) {
    const { core, taskManager, logFactory, config } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.taskInterval = config.taskInterval ?? DEFAULT_INTERVAL;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              this.abortController = new AbortController();
              return this.runTask(taskInstance, core);
            },
            cancel: async () => {
              this.abortController?.abort('Task timed out');
            },
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: AutoInstallContentPackagesTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('[AutoInstallContentPackagesTask] Missing required service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(
      `[AutoInstallContentPackagesTask] Started with interval of [${this.taskInterval}]`
    );

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: this.taskInterval,
        },
        state: {},
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.error(
        `Error scheduling task AutoInstallContentPackagesTask, error: ${e.message}`,
        e
      );
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  private endRun(msg: string = '') {
    this.logger.info(`[AutoInstallContentPackagesTask] runTask ended${msg ? ': ' + msg : ''}`);
  }

  public runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    if (!appContextService.getExperimentalFeatures().enableAutoInstallContentPackages) {
      this.logger.debug(
        '[AutoInstallContentPackagesTask] Aborting runTask: auto install content packages feature is disabled'
      );
      return;
    }
    if (!this.wasStarted) {
      this.logger.debug('[AutoInstallContentPackagesTask] runTask Aborted. Task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `[DeleteUnenrolledAgentsTask] Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.info(`[runTask()] started`);

    const [coreStart, _startDeps, { packageService }] = (await core.getStartServices()) as any;
    const packageClient = packageService.asInternalUser;
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

    try {
      if (
        !this.discoveryMap ||
        this.discoveryMapLastFetched < Date.now() - CONTENT_PACKAGES_CACHE_TTL
      ) {
        this.discoveryMapLastFetched = Date.now();
        this.logger.debug(
          `[AutoInstallContentPackagesTask] Fetching content packages to get discovery fields`
        );
        this.discoveryMap = await this.getContentPackagesDiscoveryMap();
      }

      const packagesToInstall = await this.getPackagesToInstall(esClient, this.discoveryMap);

      await this.installPackages(soClient, packageClient, packagesToInstall);

      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`[AutoInstallContentPackagesTask] request aborted due to timeout: ${err}`);
        this.endRun();
        return;
      }
      this.logger.error(`[AutoInstallContentPackagesTask] error: ${err}`);
      this.endRun('error');
    }
  };

  private async installPackages(
    savedObjectsClient: SavedObjectsClient,
    packageClient: PackageClient,
    packagesToInstall: Array<{ name: string; version: string }>
  ) {
    await pMap(
      packagesToInstall,
      async ({ name, version }) => {
        const installation = await packageClient.getInstallation(name, savedObjectsClient);

        if (installation?.install_status === 'installed' && installation.version === version) {
          this.logger.debug(
            `[AutoInstallContentPackagesTask] Package ${name}@${version} is already installed. Skipping installation.`
          );
          return;
        }

        try {
          await packageClient.installPackage({
            pkgName: name,
            pkgVersion: version,
          });
        } catch (error) {
          this.logger.warn(
            `[AutoInstallContentPackagesTask] Error installing package ${name}@${version}: ${error.message}`
          );
        }
      },
      { concurrency: MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS }
    );
  }

  private async getPackagesToInstall(esClient: ElasticsearchClient, discoveryMap: DiscoveryMap) {
    const packagesToInstall: { [name: string]: string } = {};

    for (const mapValue of Object.values(discoveryMap)) {
      const hasData = await this.hasDiscoveryFieldData(
        esClient,
        mapValue.field.name,
        mapValue.field.value
      );

      if (hasData) {
        this.logger.debug(
          `[AutoInstallContentPackagesTask] Found data for field ${
            mapValue.field.name
          } with value ${mapValue.field.value}, will install packages: ${mapValue.packages
            .map((pkg) => `${pkg.name}@${pkg.version}`)
            .join(', ')}`
        );
        for (const { name, version } of mapValue.packages) {
          packagesToInstall[name] = version;
        }
      }
    }
    return Object.entries(packagesToInstall).map(([name, version]) => ({ name, version }));
  }

  private async hasDiscoveryFieldData(
    esClient: ElasticsearchClient,
    fieldName: string,
    fieldValue: string | number | boolean
  ) {
    const discoveryMatches = await esClient.search(
      {
        index: 'logs-*;metrics-*;traces-*',
        query: {
          bool: {
            filter: [
              {
                term: {
                  [fieldName]: fieldValue,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: `now-${this.taskInterval}`,
                  },
                },
              },
            ],
          },
        },
        size: 0,
      },
      { signal: this.abortController?.signal }
    );
    if ((discoveryMatches.hits.total as SearchTotalHits).value > 0) {
      return true;
    }
    // TODO remove, for testing
    // return true;
    return false;
  }

  private async getContentPackagesDiscoveryMap() {
    const type = 'content';
    const prerelease = false;
    const discoveryMap: DiscoveryMap = {};
    const registryItems = await Registry.fetchList({ prerelease, type });

    registryItems.forEach((item) => {
      // TODO remove, for testing
      // if (item.name === 'kubernetes_otel') {
      //   item.discovery = {
      //     fields: [
      //       { name: 'data_stream.dataset', value: 'system.cpu' },
      //       { name: 'data_stream.dataset' },
      //       { name: 'test.field', value: 'test.value' },
      //     ],
      //   };
      // }
      if (item.discovery?.fields) {
        item.discovery.fields.forEach((field: DiscoveryField) => {
          if (field.name === 'data_stream.dataset' && field.value) {
            const mapKey = `${field.name}:${field.value}`;
            if (!discoveryMap[mapKey]) {
              discoveryMap[mapKey] = {
                packages: [],
                field: { name: field.name, value: field.value },
              };
            }
            discoveryMap[mapKey].packages.push({ name: item.name, version: item.version });
          }
        });
      }
    });
    // console.log(JSON.stringify(discoveryMap, null, 2));
    return discoveryMap;
  }
}
