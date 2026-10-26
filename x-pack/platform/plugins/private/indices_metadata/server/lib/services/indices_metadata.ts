/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type {
  ConcreteTaskInstance,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { AnalyticsServiceStart, ElasticsearchClient, LogMeta, Logger } from '@kbn/core/server';
import type {
  DataStream,
  DataStreams,
  IlmPolicies,
  IlmsStats,
  IndexSettings,
  IndexTemplateInfo,
  IndexTemplatesStats,
  IndicesMetadataConfiguration,
  IndicesSettings,
  IndicesStats,
} from './indices_metadata.types';

import {
  DATA_STREAM_EVENT,
  ILM_POLICY_EVENT,
  ILM_STATS_EVENT,
  INDEX_STATS_EVENT,
  INDEX_SETTINGS_EVENT,
  INDEX_TEMPLATES_EVENT,
} from '../ebt/events';
import { MetadataReceiver } from './receiver';
import { MetadataSender } from './sender';
import type { ConfigurationService } from './configuration';
import type { TelemetryConfigProvider } from './telemetry_config_provider';

const TASK_TYPE = 'IndicesMetadata:IndicesMetadataTask';
const TASK_ID = 'indices-metadata:indices-metadata-task:1.0.0';
const INTERVAL = '24h';

export class IndicesMetadataService {
  private readonly logger: Logger;
  private readonly configurationService: ConfigurationService;

  private receiver!: MetadataReceiver;
  private sender!: MetadataSender;
  private subscription$!: Subscription;
  private configuration?: IndicesMetadataConfiguration;
  private telemetryConfigProvider!: TelemetryConfigProvider;

  constructor(logger: Logger, configurationService: ConfigurationService) {
    this.logger = logger.get(IndicesMetadataService.name);
    this.configurationService = configurationService;
  }

  public setup(taskManager: TaskManagerSetupContract) {
    this.logger.debug('Setting up indices metadata service');
    this.registerIndicesMetadataTask(taskManager);
  }

  public start(
    taskManager: TaskManagerStartContract,
    analytics: AnalyticsServiceStart,
    esClient: ElasticsearchClient,
    isServerless: boolean,
    telemetryConfigProvider: TelemetryConfigProvider
  ) {
    this.logger.debug('Starting indices metadata service');

    this.receiver = new MetadataReceiver(this.logger, esClient, isServerless);
    this.sender = new MetadataSender(this.logger, analytics);
    this.telemetryConfigProvider = telemetryConfigProvider;

    this.subscription$ = this.configurationService
      .getIndicesMetadataConfiguration$()
      .subscribe((configuration) => {
        this.logger.debug('Indices metadata configuration updated', { configuration } as LogMeta);
        if (configuration) {
          this.configuration = configuration;
        }
      });

    this.scheduleIndicesMetadataTask(taskManager).catch((error) => {
      this.logger.error('Failed to schedule Indices Metadata Task', { error });
    });
  }

  public stop() {
    this.logger.debug('Stopping indices metadata service');
    this.subscription$?.unsubscribe();
  }

  private async publishIndicesMetadata() {
    this.ensureInitialized();

    if (!this.configuration || this.configuration.index_query_size === 0) {
      this.logger.debug('Index query size is 0, skipping indices metadata publish');
      return;
    }

    // 1. Get cluster stats and list of indices and datastreams
    const [indicesSettings, dataStreams, indexTemplates] = await Promise.all([
      this.receiver.getIndices(),
      this.receiver.getDataStreams(),
      this.receiver.getIndexTemplatesStats(),
    ]).catch((error) => {
      this.logger.error('Error fetching indices metadata', { error });
      return [undefined, undefined, undefined];
    });

    if (
      indicesSettings === undefined ||
      dataStreams === undefined ||
      indexTemplates === undefined
    ) {
      this.logger.debug('Skipping indices metadata publish due to fetch errors');
      return;
    }

    const indices = indicesSettings.map((index) => index.index_name);

    // 2. Publish datastreams stats
    const dsCount = this.publishDatastreamsStats(
      dataStreams.slice(0, this.configuration.datastreams_threshold)
    );

    // 3. Publish indices settings
    const indicesSettingsCount = this.publishIndicesSettings(
      indicesSettings.slice(0, this.configuration.indices_settings_threshold)
    );

    // 4. Get and publish indices stats
    const indicesCount: number = await this.publishIndicesStats(
      indices.slice(0, this.configuration.indices_threshold)
    );

    // 5. Get ILM stats and publish them
    let ilmNames = new Set<string>();
    if (await this.receiver.isIlmStatsAvailable()) {
      ilmNames = await this.publishIlmStats(indices.slice(0, this.configuration.indices_threshold));
    } else {
      this.logger.debug('ILM explain API is not available');
    }

    // 6. Publish ILM policies
    const policyCount = await this.publishIlmPolicies(ilmNames);

    // 7. Publish index templates
    const indexTemplatesCount: number = await this.publishIndexTemplatesStats(
      indexTemplates.slice(0, this.configuration.indices_threshold)
    );

    this.logger.debug('EBT events sent', {
      datastreams: dsCount,
      ilms: ilmNames.size,
      indices: indicesCount,
      indicesSettings: indicesSettingsCount,
      policies: policyCount,
      templates: indexTemplatesCount,
    } as LogMeta);
  }

  private ensureInitialized() {
    if (!this.receiver || !this.sender) {
      throw new Error('Indices metadata service not initialized');
    }
  }

  private publishDatastreamsStats(stats: DataStream[]): number {
    const events: DataStreams = { items: stats };
    this.sender.reportEBT(DATA_STREAM_EVENT, events);
    this.logger.debug('Data streams events sent', { count: events.items.length } as LogMeta);
    return events.items.length;
  }

  private registerIndicesMetadataTask(taskManager: TaskManagerSetupContract) {
    const service = this;

    this.logger.debug('About to register task', { task: TASK_ID } as LogMeta);

    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Metrics Data Access - Indices Metadata Task',
        description: 'This task periodically pushes indices metadata to the telemetry service.',
        timeout: '2m',
        maxAttempts: 1,

        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            async run() {
              const { state } = taskInstance;
              if (service.telemetryConfigProvider.getIsOptedIn()) {
                await service.publishIndicesMetadata();
              } else {
                service.logger.debug('Telemetry opted out, skipping task run');
              }
              return { state };
            },

            async cancel() {
              service.logger.warn('Task timed out', { task: TASK_ID } as LogMeta);
            },
          };
        },
      },
    });

    this.logger.debug('Task registered', { task: TASK_ID, type: TASK_TYPE } as LogMeta);
  }

  private async scheduleIndicesMetadataTask(
    taskManager: TaskManagerStartContract
  ): Promise<TaskInstance | null> {
    this.logger.debug('About to schedule task', { task: TASK_ID } as LogMeta);

    const taskInstance = await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: { interval: INTERVAL },
      params: {},
      state: {},
      scope: ['uptime'],
    });

    this.logger.debug('Task scheduled', {
      task: TASK_ID,
      interval: taskInstance.schedule?.interval,
    } as LogMeta);

    return taskInstance;
  }

  private async publishIndicesStats(indices: string[]): Promise<number> {
    if (!this.configuration) {
      return 0;
    }
    const indicesStats: IndicesStats = {
      items: [],
    };

    for await (const stat of this.receiver.getIndicesStats(
      indices,
      this.configuration.index_query_size
    )) {
      indicesStats.items.push(stat);
    }
    this.sender.reportEBT(INDEX_STATS_EVENT, indicesStats);
    this.logger.debug('Indices stats sent', {
      count: indicesStats.items.length,
    } as LogMeta);
    return indicesStats.items.length;
  }

  private publishIndicesSettings(settings: IndexSettings[]): number {
    const indicesSettings: IndicesSettings = {
      items: settings,
    };

    this.sender.reportEBT(INDEX_SETTINGS_EVENT, indicesSettings);
    this.logger.debug('Indices settings sent', { count: indicesSettings.items.length } as LogMeta);
    return indicesSettings.items.length;
  }

  private async publishIlmStats(indices: string[]): Promise<Set<string>> {
    const ilmNames = new Set<string>();
    const ilmsStats: IlmsStats = {
      items: [],
    };

    for await (const stat of this.receiver.getIlmsStats(indices)) {
      if (stat.policy_name !== undefined) {
        ilmNames.add(stat.policy_name);
        ilmsStats.items.push(stat);
      }
    }

    this.sender.reportEBT(ILM_STATS_EVENT, ilmsStats);
    this.logger.debug('ILM stats sent', { count: ilmNames.size } as LogMeta);

    return ilmNames;
  }

  async publishIlmPolicies(ilmNames: Set<string>): Promise<number> {
    if (!this.configuration) {
      return 0;
    }

    const ilmPolicies: IlmPolicies = {
      items: [],
    };

    for await (const policy of this.receiver.getIlmsPolicies(
      Array.from(ilmNames.values()),
      this.configuration.ilm_policy_query_size
    )) {
      ilmPolicies.items.push(policy);
    }
    this.sender.reportEBT(ILM_POLICY_EVENT, ilmPolicies);
    this.logger.debug('ILM policies sent', { count: ilmPolicies.items.length } as LogMeta);
    return ilmPolicies.items.length;
  }

  async publishIndexTemplatesStats(indexTemplates: IndexTemplateInfo[]): Promise<number> {
    const templateStats: IndexTemplatesStats = {
      items: indexTemplates,
    };

    this.sender.reportEBT(INDEX_TEMPLATES_EVENT, templateStats);
    this.logger.debug('Index templates stats sent', {
      count: templateStats.items.length,
    } as LogMeta);

    return templateStats.items.length;
  }
}
