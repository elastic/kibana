/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { ElasticsearchClient, Logger, SavedObject } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import pMap from 'p-map';
import { registerCleanUpTask } from './private_location/clean_up_task';
import { SyntheticsServerSetup } from '../types';
import { syntheticsMonitorType, syntheticsParamType } from '../../common/types/saved_objects';
import { sendErrorTelemetryEvents } from '../routes/telemetry/monitor_upgrade_sender';
import { installSyntheticsIndexTemplates } from '../routes/synthetics_service/install_index_templates';
import { getAPIKeyForSyntheticsService } from './get_api_key';
import { getEsHosts } from './get_es_hosts';
import { ServiceConfig } from '../../common/config';
import { ServiceAPIClient, ServiceData } from './service_api_client';

import {
  ConfigKey,
  MonitorFields,
  ServiceLocationErrors,
  ServiceLocations,
  SyntheticsMonitorWithSecretsAttributes,
  SyntheticsParams,
  ThrottlingOptions,
} from '../../common/runtime_types';
import { getServiceLocations } from './get_service_locations';

import { normalizeSecrets } from './utils/secrets';
import {
  ConfigData,
  formatHeartbeatRequest,
  formatMonitorConfigFields,
  mixParamsWithGlobalParams,
} from './formatters/public_formatters/format_configs';

const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE =
  'UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects';
const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID = 'UPTIME:SyntheticsService:sync-task';
const SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT = '5m';

export class SyntheticsService {
  private logger: Logger;
  private esClient?: ElasticsearchClient;
  private readonly server: SyntheticsServerSetup;
  public apiClient: ServiceAPIClient;

  private readonly config: ServiceConfig;
  private readonly esHosts: string[];

  public locations: ServiceLocations;
  public throttling: ThrottlingOptions | undefined;

  public indexTemplateExists?: boolean;
  private indexTemplateInstalling?: boolean;

  public isAllowed: boolean;
  public signupUrl: string | null;

  public syncErrors?: ServiceLocationErrors | null = [];

  public invalidApiKeyError?: boolean;

  constructor(server: SyntheticsServerSetup) {
    this.logger = server.logger;
    this.server = server;
    this.config = server.config.service ?? {};
    this.isAllowed = false;
    this.signupUrl = null;

    this.apiClient = new ServiceAPIClient(server.logger, this.config, this.server);

    this.esHosts = getEsHosts({ config: this.config, cloud: server.cloud });

    this.locations = [];
  }

  public async setup(taskManager: TaskManagerSetupContract) {
    this.registerSyncTask(taskManager);
    registerCleanUpTask(taskManager, this.server);

    await this.registerServiceLocations();

    const { allowed, signupUrl } = await this.apiClient.checkAccountAccessStatus();
    this.isAllowed = allowed;
    this.signupUrl = signupUrl;
  }

  public start(taskManager: TaskManagerStartContract) {
    if (this.config?.manifestUrl) {
      this.scheduleSyncTask(taskManager);
    }
    this.setupIndexTemplates();
  }

  public async setupIndexTemplates() {
    if (process.env.CI && !this.config?.manifestUrl) {
      // skip installation on CI
      return;
    }
    if (this.indexTemplateExists) {
      // if already installed, don't need to reinstall
      return;
    }
    try {
      if (!this.indexTemplateInstalling) {
        this.indexTemplateInstalling = true;

        const installedPackage = await installSyntheticsIndexTemplates(this.server);
        this.indexTemplateInstalling = false;
        if (
          installedPackage.name === 'synthetics' &&
          installedPackage.install_status === 'installed'
        ) {
          this.logger.info('Installed synthetics index templates');
          this.indexTemplateExists = true;
        } else if (
          installedPackage.name === 'synthetics' &&
          installedPackage.install_status === 'install_failed'
        ) {
          this.logger.warn(new IndexTemplateInstallationError());
          this.indexTemplateExists = false;
        }
      }
    } catch (e) {
      this.logger.error(e);
      this.indexTemplateInstalling = false;
      this.logger.warn(new IndexTemplateInstallationError());
    }
  }

  public async registerServiceLocations() {
    const service = this;

    try {
      const result = await getServiceLocations(service.server);
      service.throttling = result.throttling;
      service.locations = result.locations;
      service.apiClient.locations = result.locations;
    } catch (e) {
      this.logger.error(e);
    }
  }

  public registerSyncTask(taskManager: TaskManagerSetupContract) {
    const service = this;
    const interval = this.config.syncInterval ?? SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT;

    taskManager.registerTaskDefinitions({
      [SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE]: {
        title: 'Synthetics Service - Sync Saved Monitors',
        description: 'This task periodically pushes saved monitors to Synthetics Service.',
        timeout: '1m',
        maxAttempts: 3,

        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            // Perform the work of the task. The return value should fit the TaskResult interface.
            async run() {
              const { state } = taskInstance;
              try {
                await service.registerServiceLocations();

                const { allowed, signupUrl } = await service.apiClient.checkAccountAccessStatus();
                service.isAllowed = allowed;
                service.signupUrl = signupUrl;

                if (service.isAllowed && service.config.manifestUrl) {
                  service.setupIndexTemplates();
                  await service.pushConfigs();
                }
              } catch (e) {
                sendErrorTelemetryEvents(service.logger, service.server.telemetry, {
                  reason: 'Failed to run scheduled sync task',
                  message: e?.message,
                  type: 'runTaskError',
                  code: e?.code,
                  status: e.status,
                  stackVersion: service.server.stackVersion,
                });
                service.logger.error(e);
              }

              return { state, schedule: { interval } };
            },
            async cancel() {
              service.logger?.warn(`Task ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID} timed out`);
            },
          };
        },
      },
    });
  }

  public async scheduleSyncTask(
    taskManager: TaskManagerStartContract
  ): Promise<TaskInstance | null> {
    const interval = this.config.syncInterval ?? SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT;

    try {
      const taskInstance = await taskManager.ensureScheduled({
        id: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID,
        taskType: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE,
        schedule: {
          interval,
        },
        params: {},
        state: {},
        scope: ['uptime'],
      });

      this.logger?.info(
        `Task ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}.`
      );

      return taskInstance;
    } catch (e) {
      sendErrorTelemetryEvents(this.logger, this.server.telemetry, {
        reason: 'Failed to schedule sync task',
        message: e?.message ?? e,
        type: 'scheduleTaskError',
        code: e?.code,
        status: e.status,
        stackVersion: this.server.stackVersion,
      });

      this.logger?.error(e);

      this.logger?.error(
        `Error running synthetics syncs task: ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID}, ${e?.message}`
      );

      return null;
    }
  }

  private async getLicense() {
    this.esClient = this.getESClient();
    let license;
    if (this.esClient === undefined || this.esClient === null) {
      throw Error(
        'Cannot sync monitors with the Synthetics service. Elasticsearch client is unavailable: cannot retrieve license information'
      );
    }
    try {
      license = (await this.esClient.license.get())?.license;
    } catch (e) {
      throw new Error(
        `Cannot sync monitors with the Synthetics service. Unable to determine license level: ${e}`
      );
    }

    if (license?.status === 'expired') {
      throw new Error('Cannot sync monitors with the Synthetics service. License is expired.');
    }

    if (!license?.type) {
      throw new Error(
        'Cannot sync monitors with the Synthetics service. Unable to determine license level.'
      );
    }

    return license;
  }

  private async getSOClientFinder({ pageSize }: { pageSize: number }) {
    const encryptedClient = this.server.encryptedSavedObjects.getClient();

    return await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
      {
        type: syntheticsMonitorType,
        perPage: pageSize,
        namespaces: [ALL_SPACES_ID],
      }
    );
  }

  private getESClient() {
    if (!this.server.coreStart) {
      return;
    }
    return this.server.coreStart?.elasticsearch.client.asInternalUser;
  }

  async getOutput() {
    const { apiKey, isValid } = await getAPIKeyForSyntheticsService({ server: this.server });
    if (!isValid) {
      this.server.logger.error(
        'API key is not valid. Cannot push monitor configuration to synthetics public testing locations'
      );
      this.invalidApiKeyError = true;
      return null;
    }

    return {
      hosts: this.esHosts,
      api_key: `${apiKey?.id}:${apiKey?.apiKey}`,
    };
  }

  async inspectConfig(config?: ConfigData) {
    if (!config) {
      return null;
    }
    const monitors = this.formatConfigs(config);
    const license = await this.getLicense();

    const output = await this.getOutput();
    if (output) {
      return await this.apiClient.inspect({
        monitors,
        output,
        license,
      });
    }
    return null;
  }

  async addConfigs(configs: ConfigData[]) {
    try {
      if (configs.length === 0) {
        return;
      }

      const monitors = this.formatConfigs(configs);
      const license = await this.getLicense();

      const output = await this.getOutput();
      if (output) {
        this.logger.debug(`1 monitor will be pushed to synthetics service.`);

        this.syncErrors = await this.apiClient.post({
          monitors,
          output,
          license,
        });
      }
      return this.syncErrors;
    } catch (e) {
      this.logger.error(e);
    }
  }

  async editConfig(monitorConfig: ConfigData[], isEdit = true) {
    try {
      if (monitorConfig.length === 0) {
        return;
      }
      const license = await this.getLicense();
      const monitors = this.formatConfigs(monitorConfig);

      const output = await this.getOutput();
      if (output) {
        const data = {
          monitors,
          output,
          isEdit,
          license,
        };

        this.syncErrors = await this.apiClient.put(data);
      }
      return this.syncErrors;
    } catch (e) {
      this.logger.error(e);
    }
  }

  async pushConfigs() {
    const license = await this.getLicense();
    const service = this;

    const PER_PAGE = 250;
    service.syncErrors = [];

    let output: ServiceData['output'] | null = null;

    const paramsBySpace = await this.getSyntheticsParams();
    const finder = await this.getSOClientFinder({ pageSize: PER_PAGE });

    const bucketsByLocation: Record<string, MonitorFields[]> = {};
    this.locations.forEach((location) => {
      bucketsByLocation[location.id] = [];
    });

    const syncAllLocations = async (perBucket = 0) => {
      await pMap(
        this.locations,
        async (location) => {
          if (bucketsByLocation[location.id].length > perBucket && output) {
            const locMonitors = bucketsByLocation[location.id].splice(0, PER_PAGE);

            this.logger.debug(
              `${locMonitors.length} monitors will be pushed to synthetics service for location ${location.id}.`
            );

            const syncErrors = await this.apiClient.syncMonitors({
              monitors: locMonitors,
              output,
              license,
              location,
            });

            this.syncErrors = [...(this.syncErrors ?? []), ...(syncErrors ?? [])];
          }
        },
        {
          stopOnError: false,
        }
      );
    };

    for await (const result of finder.find()) {
      if (result.saved_objects.length > 0) {
        try {
          if (!output) {
            output = await this.getOutput();
            if (!output) {
              sendErrorTelemetryEvents(service.logger, service.server.telemetry, {
                reason: 'API key is not valid.',
                message: 'Failed to push configs. API key is not valid.',
                type: 'invalidApiKey',
                stackVersion: service.server.stackVersion,
              });
              return;
            }
          }

          const monitors = result.saved_objects.filter(({ error }) => !error);
          const formattedConfigs = this.normalizeConfigs(monitors, paramsBySpace);

          this.logger.debug(
            `${formattedConfigs.length} monitors will be pushed to synthetics service.`
          );

          formattedConfigs.forEach((monitor) => {
            monitor.locations.forEach((location) => {
              if (location.isServiceManaged) {
                bucketsByLocation[location.id]?.push(monitor);
              }
            });
          });

          await syncAllLocations(PER_PAGE);
        } catch (e) {
          sendErrorTelemetryEvents(service.logger, service.server.telemetry, {
            reason: 'Failed to push configs to service',
            message: e?.message,
            type: 'pushConfigsError',
            code: e?.code,
            status: e.status,
            stackVersion: service.server.stackVersion,
          });
          this.logger.error(e);
        }
      }
    }

    // execute the remaining monitors
    await syncAllLocations();

    await finder.close();
  }

  async runOnceConfigs(configs?: ConfigData) {
    if (!configs) {
      return;
    }
    const monitors = this.formatConfigs(configs);
    if (monitors.length === 0) {
      return;
    }
    const license = await this.getLicense();

    const output = await this.getOutput();
    if (!output) {
      return;
    }

    try {
      return await this.apiClient.runOnce({
        monitors,
        output,
        license,
      });
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async deleteConfigs(configs: ConfigData[]) {
    try {
      if (configs.length === 0) {
        return;
      }
      const license = await this.getLicense();
      const hasPublicLocations = configs.some((config) =>
        config.monitor.locations.some(({ isServiceManaged }) => isServiceManaged)
      );

      if (hasPublicLocations) {
        const output = await this.getOutput();
        if (!output) {
          return;
        }

        const data = {
          output,
          monitors: this.formatConfigs(configs),
          license,
        };
        return await this.apiClient.delete(data);
      }
    } catch (e) {
      this.server.logger.error(e);
    }
  }

  async deleteAllConfigs() {
    const license = await this.getLicense();
    const paramsBySpace = await this.getSyntheticsParams();
    const finder = await this.getSOClientFinder({ pageSize: 100 });
    const output = await this.getOutput();
    if (!output) {
      return;
    }

    for await (const result of finder.find()) {
      const monitors = this.normalizeConfigs(result.saved_objects, paramsBySpace);
      const hasPublicLocations = monitors.some((config) =>
        config.locations.some(({ isServiceManaged }) => isServiceManaged)
      );

      if (hasPublicLocations) {
        const data = {
          output,
          monitors,
          license,
        };
        return await this.apiClient.delete(data);
      }
    }
  }

  async getSyntheticsParams({
    spaceId,
    hideParams = false,
    canSave = true,
  }: { spaceId?: string; canSave?: boolean; hideParams?: boolean } = {}) {
    if (!canSave) {
      return Object.create(null);
    }
    const encryptedClient = this.server.encryptedSavedObjects.getClient();

    const paramsBySpace: Record<string, Record<string, string>> = Object.create(null);

    const finder =
      await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsParams>({
        type: syntheticsParamType,
        perPage: 1000,
        namespaces: spaceId ? [spaceId] : [ALL_SPACES_ID],
      });

    for await (const response of finder.find()) {
      response.saved_objects.forEach((param) => {
        param.namespaces?.forEach((namespace) => {
          if (!paramsBySpace[namespace]) {
            paramsBySpace[namespace] = Object.create(null);
          }
          paramsBySpace[namespace][param.attributes.key] = hideParams
            ? '"*******"'
            : param.attributes.value;
        });
      });
    }

    // no need to wait here
    finder.close();

    if (paramsBySpace[ALL_SPACES_ID]) {
      Object.keys(paramsBySpace).forEach((space) => {
        if (space !== ALL_SPACES_ID) {
          paramsBySpace[space] = Object.assign(paramsBySpace[ALL_SPACES_ID], paramsBySpace[space]);
        }
      });
      if (spaceId) {
        paramsBySpace[spaceId] = {
          ...(paramsBySpace?.[spaceId] ?? {}),
          ...(paramsBySpace?.[ALL_SPACES_ID] ?? {}),
        };
      }
    }

    return paramsBySpace;
  }

  formatConfigs(configData: ConfigData[] | ConfigData) {
    const configDataList = Array.isArray(configData) ? configData : [configData];

    return configDataList.map((config) => {
      const { str: paramsString, params } = mixParamsWithGlobalParams(
        config.params,
        config.monitor
      );

      const asHeartbeatConfig = formatHeartbeatRequest(config, paramsString);

      return formatMonitorConfigFields(
        Object.keys(asHeartbeatConfig) as ConfigKey[],
        asHeartbeatConfig as Partial<MonitorFields>,
        this.logger,
        params ?? {}
      );
    });
  }

  normalizeConfigs(
    monitors: Array<SavedObject<SyntheticsMonitorWithSecretsAttributes>>,
    paramsBySpace: Record<string, Record<string, string>>
  ) {
    const configDataList = (monitors ?? []).map((monitor) => {
      const attributes = monitor.attributes as unknown as MonitorFields;
      const monitorSpace = monitor.namespaces?.[0] ?? DEFAULT_SPACE_ID;

      const params = paramsBySpace[monitorSpace];

      return {
        params: { ...params, ...(paramsBySpace?.[ALL_SPACES_ID] ?? {}) },
        monitor: normalizeSecrets(monitor).attributes,
        configId: monitor.id,
        heartbeatId: attributes[ConfigKey.MONITOR_QUERY_ID],
        spaceId: monitorSpace,
      };
    });

    return this.formatConfigs(configDataList) as MonitorFields[];
  }
}

class IndexTemplateInstallationError extends Error {
  constructor() {
    super();
    this.message = 'Failed to install synthetics index templates.';
    this.name = 'IndexTemplateInstallationError';
  }
}
