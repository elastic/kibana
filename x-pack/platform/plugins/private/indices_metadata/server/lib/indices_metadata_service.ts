/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { LogMeta, Logger } from '@kbn/core/server';
import type {
  DataStream,
  DataStreams,
  IlmPolicies,
  IlmsStats,
  IndicesMetadataServiceInit,
  IndicesMetadataServiceSetup,
  IndicesMetadataServiceStart,
  IndicesStats,
} from './indices_metadata_service.types';

import type { IMetadataReceiver } from './receiver.types';
import type { IMetadataSender } from './sender.types';
import {
  DATA_STREAM_EVENT,
  ILM_POLICY_EVENT,
  ILM_STATS_EVENT,
  INDEX_STATS_EVENT,
} from './ebt/events';

const TASK_TYPE = 'IndicesMetadata:IndicesMetadataTask';
const TASK_ID = 'indices-metadata:indices-metadata-task:1.0.0';
const INTERVAL = '24h';

export class IndicesMetadataService {
  private readonly logger: Logger;
  private readonly receiver: IMetadataReceiver;
  private readonly sender: IMetadataSender;

  constructor({ logger, receiver, sender }: IndicesMetadataServiceInit) {
    this.logger = logger.get(IndicesMetadataService.name);
    this.receiver = receiver;
    this.sender = sender;
  }

  public setup(setup: IndicesMetadataServiceSetup) {
    this.logger.debug('Setting up indices metadata service');
    this.registerIndicesMetadataTask(setup.taskManager);
  }

  public async start(start: IndicesMetadataServiceStart) {
    this.logger.debug('Starting indices metadata service');

    await this.scheduleIndicesMetadataTask(start.taskManager)
      .catch((error) => {
        this.logger.error('Failed to schedule Indices Metadata Task', { error });
      })
      .then(() => {
        this.logger.debug('Indices Metadata Task scheduled');
      });
  }

  private async publishIndicesMetadata() {
    this.logger.debug('About to publish indices metadata');

    // 1. Get cluster stats and list of indices and datastreams
    const [indices, dataStreams] = await Promise.all([
      this.receiver.getIndices(),
      this.receiver.getDataStreams(),
    ]);

    // 2. Publish datastreams stats
    const dsCount = this.publishDatastreamsStats(
      dataStreams.slice(0, 1000) // TODO threshold should be configured somewhere
    );

    // 3. Get and publish indices stats
    const indicesCount: number = await this.publishIndicesStats(
      indices.slice(0, 1000) // TODO threshold should be configured somewhere
    )
      .then((count) => {
        return count;
      })
      .catch((error) => {
        this.logger.error('Error getting indices stats', { error });
        return 0;
      });

    // 4. Get ILM stats and publish them
    let ilmNames = new Set<string>();

    if (await this.receiver.isIlmStatsAvailable()) {
      ilmNames = await this.publishIlmStats(indices.slice(0, 1000)) // TODO threshold should be configured somewhere
        .then((names) => {
          return names;
        })
        .catch((error) => {
          this.logger.error('Error getting ILM stats', { error });
          return new Set<string>();
        });
    } else {
      this.logger.debug('ILM explain API is not available');
    }

    // 5. Publish ILM policies
    const policyCount = await this.publishIlmPolicies(ilmNames)
      .then((count) => {
        return count;
      })
      .catch((error) => {
        this.logger.warn('Error getting ILM policies', { error });
        return 0;
      });

    this.logger.debug('EBT events sent', {
      datastreams: dsCount,
      ilms: ilmNames.size,
      indices: indicesCount,
      policies: policyCount,
    } as LogMeta);
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
              await service.publishIndicesMetadata();
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

    try {
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
    } catch (error) {
      this.logger.error('ng synthetics syncs task', { task: TASK_ID, error });
      return null;
    }
  }

  private async publishIndicesStats(indices: string[]): Promise<number> {
    const indicesStats: IndicesStats = {
      items: [],
    };

    for await (const stat of this.receiver.getIndicesStats(indices)) {
      indicesStats.items.push(stat);
    }
    this.sender.reportEBT(INDEX_STATS_EVENT, indicesStats);
    this.logger.debug('Indices stats sent', { count: indicesStats.items.length } as LogMeta);
    return indicesStats.items.length;
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
    const ilmPolicies: IlmPolicies = {
      items: [],
    };

    for await (const policy of this.receiver.getIlmsPolicies(Array.from(ilmNames.values()))) {
      ilmPolicies.items.push(policy);
    }
    this.sender.reportEBT(ILM_POLICY_EVENT, ilmPolicies);
    this.logger.debug('ILM policies sent', { count: ilmPolicies.items.length } as LogMeta);
    return ilmPolicies.items.length;
  }
}
