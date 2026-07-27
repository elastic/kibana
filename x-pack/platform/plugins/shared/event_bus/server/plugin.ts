/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  ElasticsearchClient,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { EventBusConfig } from './config';
import type { EventBusSetup, EventBusStart, EventHandler, EventTypeDefinition } from './types';
import { getEsNames, type EsNames } from './es/names';
import { ResourceInstaller } from './es/resource_installer';
import { EventPublisher } from './publisher';
import { SubscriptionRegistry } from './subscription_registry';
import { NodeTailLoop } from './tail/node_tail_loop';
import {
  registerDurableConsumerTask,
  scheduleDurableConsumer,
} from './durable/durable_consumer_task';

export interface EventBusSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface EventBusStartDeps {
  taskManager: TaskManagerStartContract;
}

export class EventBusPlugin
  implements Plugin<EventBusSetup, EventBusStart, EventBusSetupDeps, EventBusStartDeps>
{
  private readonly logger: Logger;
  private readonly config: EventBusConfig;
  private readonly nodeId: string;
  private readonly registry = new SubscriptionRegistry();
  private readonly eventTypes = new Map<string, EventTypeDefinition>();

  private names?: EsNames;
  private esClientPromise?: Promise<ElasticsearchClient>;
  private installer?: ResourceInstaller;
  private publisher?: EventPublisher;
  private nodeTailLoop?: NodeTailLoop;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.config = context.config.get<EventBusConfig>();
    this.nodeId = context.env.instanceUuid;
  }

  public setup(core: CoreSetup, plugins: EventBusSetupDeps): EventBusSetup {
    const names = getEsNames(core.savedObjects.getDefaultIndex());
    this.names = names;

    // Resolve the internal ES client lazily; only available at start.
    this.esClientPromise = core
      .getStartServices()
      .then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser);

    // M3: register the durable consumer task type (scheduling happens per
    // consumer, when subscribe({ durable: true }) is called).
    registerDurableConsumerTask({
      taskManager: plugins.taskManager,
      getEsClient: () => this.esClientPromise!,
      registry: this.registry,
      names,
      logger: this.logger,
      safetyLagMs: this.config.safetyLag.asMilliseconds(),
      batchSize: this.config.batchSize,
    });

    return {
      registerEventType: (definition: EventTypeDefinition) => {
        if (this.eventTypes.has(definition.type)) {
          throw new Error(`event bus type "${definition.type}" is already registered`);
        }
        this.eventTypes.set(definition.type, definition);
      },
    };
  }

  public start(core: CoreStart, plugins: EventBusStartDeps): EventBusStart {
    const esClient = core.elasticsearch.client.asInternalUser;
    const names = this.names!;

    this.installer = new ResourceInstaller({
      esClient,
      logger: this.logger,
      names,
      retention: this.config.retention,
    });
    void this.installer.install().then((ok) => {
      if (!ok) {
        this.logger.error(
          'event bus resources failed to initialize; publish/subscribe will not work'
        );
      }
    });

    this.publisher = new EventPublisher({ esClient, names, nodeId: this.nodeId });

    this.nodeTailLoop = new NodeTailLoop({
      esClient,
      names,
      nodeId: this.nodeId,
      registry: this.registry,
      logger: this.logger,
      pollIntervalMs: this.config.pollInterval.asMilliseconds(),
      safetyLagMs: this.config.safetyLag.asMilliseconds(),
      batchSize: this.config.batchSize,
    });

    const durableIntervalMs = this.config.durable.pollInterval.asMilliseconds();

    return {
      publish: async (event) => {
        const ready = await this.installer!.waitUntilReady();
        if (!ready) {
          throw new Error('event bus is not initialized');
        }
        this.validateEvent(event.type, event.payload);
        await this.publisher!.publish(event);
      },

      subscribe: (options, handler) => {
        const typedHandler = handler as unknown as EventHandler;

        if (options.durable) {
          if (!options.consumer) {
            throw new Error('durable event bus subscriptions require a stable "consumer" id');
          }
          const consumer = options.consumer;
          this.registry.registerDurable(consumer, options.types, typedHandler);
          void scheduleDurableConsumer({
            taskManager: plugins.taskManager,
            consumer,
            types: options.types,
            startTs: Date.now(),
            intervalMs: durableIntervalMs,
          }).catch((err) => {
            this.logger.error(
              `failed to schedule durable event bus consumer "${consumer}": ${err.message}`
            );
          });
          return { unsubscribe: () => this.registry.unregisterDurable(consumer) };
        }

        const id = this.registry.addEphemeral(options.types, typedHandler);
        this.nodeTailLoop!.start();
        return { unsubscribe: () => this.registry.removeEphemeral(id) };
      },
    };
  }

  public stop(): void {
    this.nodeTailLoop?.stop();
  }

  private validateEvent(type: string, payload: unknown): void {
    const definition = this.eventTypes.get(type);
    if (!definition) {
      throw new Error(`event bus type "${type}" is not registered`);
    }
    if (definition.schema) {
      definition.schema.validate(payload);
    }
  }
}
