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
import {
  TASK_TYPE,
  TASK_ID,
  TASK_INTERVAL,
  TASK_TIMEOUT,
  DEFAULT_OTEL_TELEMETRY_CONFIGURATION,
} from '../constants';
import type { SignalType, OtelTelemetryConfiguration } from '../constants';
import type { OtelPerServiceResult } from './types';
import type { CompositeBucket } from './receiver';
import { OtelTelemetryReceiver } from './receiver';
import { OtelTelemetrySender } from './sender';
import type { TelemetryConfigProvider } from './telemetry_config_provider';
import type { ConfigurationService } from './configuration';

const TERMS_AGG_KEYS = [
  'sdk_names',
  'sdk_languages',
  'sdk_versions',
  'distro_names',
  'distro_versions',
  'cloud_providers',
  'cloud_platforms',
  'cloud_regions',
  'cloud_az',
  'host_archs',
  'os_types',
  'os_names',
  'os_versions',
  'os_descriptions',
  'device_manufacturers',
  'device_model_names',
  'browser_platforms',
  'user_agent_originals',
  'runtime_names',
  'runtime_versions',
  'runtime_descriptions',
  'executable_names',
  'webengine_names',
  'webengine_versions',
  'webengine_descriptions',
  'scope_names',
  'upstream_cluster',
] as const;

type TermsAggKey = (typeof TERMS_AGG_KEYS)[number];

const extractKeys = (agg: { buckets: Array<{ key: string }> }): string[] =>
  agg.buckets.map((b) => b.key);

export class OtelTelemetryService {
  private readonly logger: Logger;

  private receiver!: OtelTelemetryReceiver;
  private sender!: OtelTelemetrySender;
  private telemetryConfigProvider!: TelemetryConfigProvider;
  private configuration: OtelTelemetryConfiguration = DEFAULT_OTEL_TELEMETRY_CONFIGURATION;
  private configSubscription?: Subscription;

  constructor(logger: Logger, private readonly configurationService: ConfigurationService) {
    this.logger = logger.get(OtelTelemetryService.name);
  }

  public setup(taskManager: TaskManagerSetupContract) {
    this.logger.debug('Setting up OTel telemetry service');
    this.registerTask(taskManager);
  }

  public start(
    taskManager: TaskManagerStartContract,
    analytics: AnalyticsServiceStart,
    esClient: ElasticsearchClient,
    telemetryConfigProvider: TelemetryConfigProvider
  ) {
    this.logger.debug('Starting OTel telemetry service');
    this.receiver = new OtelTelemetryReceiver(this.logger, esClient);
    this.sender = new OtelTelemetrySender(this.logger, analytics);
    this.telemetryConfigProvider = telemetryConfigProvider;

    this.configSubscription = this.configurationService
      .getOtelTelemetryConfiguration$()
      .subscribe((cfg) => {
        this.logger.debug('OTel telemetry configuration updated', {
          configuration: cfg,
        } as LogMeta);
        if (cfg) {
          this.configuration = cfg;
        }
      });

    this.scheduleTask(taskManager).catch((error) => {
      this.logger.error('Failed to schedule OTel per-service task', { error });
    });
  }

  public stop() {
    this.configSubscription?.unsubscribe();
  }

  private registerTask(taskManager: TaskManagerSetupContract) {
    const service = this;

    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'OTel Telemetry Collection - Per Service Task',
        description:
          'Periodically collects per-service OTel resource attributes and ships them via EBT.',
        timeout: TASK_TIMEOUT,
        maxAttempts: 1,

        createTaskRunner: ({
          taskInstance,
          abortController,
        }: {
          taskInstance: ConcreteTaskInstance;
          abortController: AbortController;
        }) => ({
          async run() {
            const { state } = taskInstance;

            if (service.telemetryConfigProvider.getIsOptedIn()) {
              await service.publishOtelPerServiceStats(abortController.signal);
            } else {
              service.logger.debug('Telemetry opted out, skipping OTel per-service task run');
            }

            return { state };
          },
        }),
      },
    });

    this.logger.debug('Task registered', { task: TASK_ID, type: TASK_TYPE } as LogMeta);
  }

  private async scheduleTask(taskManager: TaskManagerStartContract): Promise<TaskInstance | null> {
    this.logger.debug('Scheduling task', { task: TASK_ID } as LogMeta);

    const taskInstance = await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: { interval: TASK_INTERVAL },
      params: {},
      state: {},
      scope: ['otelTelemetryCollection'],
    });

    this.logger.debug('Task scheduled', {
      task: TASK_ID,
      task_interval: taskInstance.schedule?.interval,
    } as LogMeta);

    return taskInstance;
  }

  private async publishOtelPerServiceStats(abortSignal?: AbortSignal) {
    const config = this.configuration;

    if (!config.enabled) {
      this.logger.debug('OTel per-service collection is disabled via CDN config (kill switch)');
      return;
    }

    this.logger.info('Starting OTel per-service stats collection');

    const signalBuckets = await this.receiver.fetchAllSignals(config, abortSignal);

    for (const signal of ['traces', 'metrics', 'logs'] as const) {
      const buckets = signalBuckets[signal];

      if (buckets.length === 0) {
        this.logger.debug(`No buckets for ${signal}, skipping`);
        continue;
      }

      const results = this.convertBuckets(signal, buckets);
      this.sender.report(results, config.max_elements_per_event);

      this.logger.info(`OTel per-service stats reported for ${signal}`, {
        signal,
        resultCount: results.length,
      } as LogMeta);
    }
  }

  private convertBuckets(signal: SignalType, buckets: CompositeBucket[]): OtelPerServiceResult[] {
    return buckets.map((bucket) => {
      const result: OtelPerServiceResult = {
        signal,
        service_id: bucket.key.service_name,
        environment: bucket.key.environment ?? '',
        doc_count: bucket.doc_count,
        sdk_names: [],
        sdk_languages: [],
        sdk_versions: [],
        distro_names: [],
        distro_versions: [],
        cloud_providers: [],
        cloud_platforms: [],
        cloud_regions: [],
        cloud_az: [],
        host_archs: [],
        os_types: [],
        os_names: [],
        os_versions: [],
        os_descriptions: [],
        device_manufacturers: [],
        device_model_names: [],
        browser_platforms: [],
        user_agent_originals: [],
        runtime_names: [],
        runtime_versions: [],
        runtime_descriptions: [],
        executable_names: [],
        webengine_names: [],
        webengine_versions: [],
        webengine_descriptions: [],
        scope_names: [],
        upstream_cluster: [],
        has_k8s: bucket.has_k8s.doc_count > 0,
        has_container: bucket.has_container.doc_count > 0,
      };

      for (const aggKey of TERMS_AGG_KEYS) {
        result[aggKey] = extractKeys(bucket.sample[aggKey as TermsAggKey]);
      }

      return result;
    });
  }
}
