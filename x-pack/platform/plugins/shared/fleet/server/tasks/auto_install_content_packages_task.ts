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

import type { DiscoveryDataset } from '../../common/types';

import type { PackageClient } from '../services';
import { appContextService } from '../services';
import * as Registry from '../services/epm/registry';

import { MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS, SO_SEARCH_LIMIT } from '../constants';
import { getInstalledPackages } from '../services/epm/packages';

export const TYPE = 'fleet:auto-install-content-packages-task';
export const VERSION = '1.0.0';
const TITLE = 'Fleet Auto Install Content Packages Task';
const SCOPE = ['fleet'];
const DEFAULT_INTERVAL = '10m';
const TIMEOUT = '5m';
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

      const installedPackages = await getInstalledPackages({
        savedObjectsClient: soClient,
        esClient,
        perPage: SO_SEARCH_LIMIT,
        sortOrder: 'asc',
      });
      const installedPackagesMap: { [name: string]: string } = installedPackages.items.reduce(
        (acc, pkg) => {
          acc[pkg.name] = pkg.version;
          return acc;
        },
        {} as { [name: string]: string }
      );

      const discoveryMapWithNotInstalledPackages: DiscoveryMap = Object.entries(
        this.discoveryMap
      ).reduce((acc, [dataset, mapValue]) => {
        const packages = mapValue.packages.filter(
          (pkg) => !installedPackagesMap[pkg.name] || installedPackagesMap[pkg.name] !== pkg.version
        );
        if (packages.length > 0) {
          acc[dataset] = { packages };
        }
        return acc;
      }, {} as DiscoveryMap);

      const datasetsInContentPacks = Object.keys(discoveryMapWithNotInstalledPackages);
      if (datasetsInContentPacks.length === 0) {
        return;
      }

      const packagesToInstall = await this.getPackagesToInstall(
        esClient,
        discoveryMapWithNotInstalledPackages,
        datasetsInContentPacks,
        installedPackagesMap
      );
      this.logger.debug(
        `[AutoInstallContentPackagesTask] Content packages to install: ${packagesToInstall
          .map((pkg) => `${pkg.name}@${pkg.version}`)
          .join(', ')}`
      );

      await this.installPackages(packageClient, packagesToInstall);

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
    packageClient: PackageClient,
    packagesToInstall: Array<{ name: string; version: string }>
  ) {
    await pMap(
      packagesToInstall,
      async ({ name, version }) => {
        try {
          await packageClient.installPackage({
            pkgName: name,
            pkgVersion: version,
            useStreaming: true, // Use streaming for content packages
            automaticInstall: true,
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

  private async getPackagesToInstall(
    esClient: ElasticsearchClient,
    discoveryMap: DiscoveryMap,
    datasetsInContentPacks: string[],
    installedPackagesMap: { [name: string]: string }
  ) {
    const datasetsWithData = await this.getDatasetsWithData(esClient, datasetsInContentPacks);

    const packagesToInstall: { [name: string]: string } = {};

    for (const [dataset, mapValue] of Object.entries(discoveryMap)) {
      const packages = mapValue.packages;

      const hasData = datasetsWithData.includes(dataset);

      if (hasData) {
        for (const { name, version } of packages) {
          if (!installedPackagesMap[name] || installedPackagesMap[name] !== version) {
            packagesToInstall[name] = version;
          }
        }
      }
    }
    return Object.entries(packagesToInstall).map(([name, version]) => ({ name, version }));
  }

  private async getDatasetsWithData(
    esClient: ElasticsearchClient,
    datasetsInContentPacks: string[]
  ): Promise<string[]> {
    const response = await esClient.esql.query({
      query: `FROM logs-*,metrics-*,traces-* | STATS COUNT(*) BY data_stream.dataset | LIMIT 1000 | WHERE data_stream.dataset IN (${datasetsInContentPacks
        .map((dataset) => `"${dataset}"`)
        .join(',')})`,
      filter: {
        range: {
          '@timestamp': {
            gte: `now-${this.taskInterval}`,
          },
        },
      },
    });
    this.logger.debug(`[AutoInstallContentPackagesTask] ESQL query took: ${response.took}ms`);

    const datasetsWithData: string[] = response.values.map((value: any[]) => value[1]);
    this.logger.debug(
      `[AutoInstallContentPackagesTask] Found datasets with data: ${datasetsWithData.join(', ')}`
    );
    return datasetsWithData;
  }

  private async getContentPackagesDiscoveryMap(): Promise<DiscoveryMap> {
    const type = 'content';
    const prerelease = false;
    const discoveryMap: DiscoveryMap = {};
    const registryItems = await Registry.fetchList({ prerelease, type });

    registryItems.forEach((item) => {
      if (item.discovery?.datasets) {
        item.discovery.datasets.forEach((field: DiscoveryDataset) => {
          if (field.name) {
            if (!discoveryMap[field.name]) {
              discoveryMap[field.name] = {
                packages: [],
              };
            }
            discoveryMap[field.name].packages.push({ name: item.name, version: item.version });
          }
        });
      }
    });
    return discoveryMap;
  }
}
