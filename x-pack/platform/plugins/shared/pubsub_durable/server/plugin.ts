/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { PubSubDurableDelegate, PubSubDurableSubscription } from '@kbn/core-pubsub-server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  createTaskRunError,
  TaskAlreadyRunningError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server';
import { SAFETY_NET_INTERVAL, TASK_TIMEOUT, getTaskId, getTaskType } from './constants';
import {
  initialDrainState,
  normalizeDrainState,
  runDrain,
  stateSchemaByVersion,
} from './drain_runner';
import type { EventsStore } from './events_store';
import { createEventsIndexIfMissing, createEventsStore } from './events_store';
import { Nudger } from './nudger';

interface SetupDeps {
  taskManager: TaskManagerSetupContract;
}

interface StartDeps {
  taskManager: TaskManagerStartContract;
}

const subscriptionKey = (consumer: string, topic: string) => `${consumer}\n${topic}`;

export class PubSubDurablePlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  private readonly logger: Logger;
  private readonly subscriptions = new Map<string, PubSubDurableSubscription>();
  private readonly registeredTaskTypes = new Set<string>();
  private taskManagerSetup: TaskManagerSetupContract | undefined;
  private store: EventsStore | undefined;
  private nudger: Nudger | undefined;
  private resolveReady: () => void = () => {};
  private readonly ready = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<StartDeps>, { taskManager }: SetupDeps) {
    this.taskManagerSetup = taskManager;

    const delegate: PubSubDurableDelegate = {
      onSubscribe: (subscription) => this.onSubscribe(subscription),
      append: async (event) => {
        await this.ready;
        await this.store!.append(event);
        if (process.env.PUBSUB_DURABLE_NUDGE === 'off') return; // PoC switch for latency comparisons
        this.subscriptionsForTopic(event.topic).forEach(({ consumer, topic }) =>
          this.nudger?.nudge(getTaskId(consumer, topic))
        );
      },
    };
    core.pubsub.registerDurableDelegate(delegate);
  }

  public start(_core: CoreStart, { taskManager }: StartDeps) {
    this.nudger = new Nudger({
      runSoon: (taskId) => taskManager.runSoon(taskId),
      isAlreadyRunningError: (error) => error instanceof TaskAlreadyRunningError,
      logger: this.logger,
    });
  }

  /** Runs after the start phase. Publishes and drain runs wait on `ready` until it has finished. */
  public async initialize(core: CoreStart, { taskManager }: StartDeps) {
    const esClient = core.elasticsearch.client.asInternalUser;
    await createEventsIndexIfMissing(esClient, this.logger);
    this.store = createEventsStore(esClient, this.logger);
    this.resolveReady();

    await Promise.all(
      [...this.subscriptions.values()].map(({ consumer, topic }) =>
        taskManager.ensureScheduled({
          id: getTaskId(consumer, topic),
          taskType: getTaskType(consumer),
          params: { consumer, topic },
          state: initialDrainState,
          schedule: { interval: SAFETY_NET_INTERVAL },
        })
      )
    );
  }

  public stop() {
    this.nudger?.stop();
  }

  private subscriptionsForTopic(topic: string): PubSubDurableSubscription[] {
    return [...this.subscriptions.values()].filter((subscription) => subscription.topic === topic);
  }

  private onSubscribe(subscription: PubSubDurableSubscription): void {
    this.subscriptions.set(
      subscriptionKey(subscription.consumer, subscription.topic),
      subscription
    );
    this.registerTaskType(subscription.consumer);
  }

  private registerTaskType(consumer: string): void {
    const taskType = getTaskType(consumer);
    if (this.registeredTaskTypes.has(taskType)) return;
    this.registeredTaskTypes.add(taskType);

    this.taskManagerSetup!.registerTaskDefinitions({
      [taskType]: {
        title: `Durable pubsub consumer ${consumer}`,
        timeout: TASK_TIMEOUT,
        paramsSchema: schema.object({
          consumer: schema.string({ maxLength: 256 }),
          topic: schema.string({ maxLength: 256 }),
        }),
        stateSchemaByVersion,
        createTaskRunner: ({ taskInstance, signal }) => ({
          run: async () => {
            const { consumer: taskConsumer, topic } = taskInstance.params as {
              consumer: string;
              topic: string;
            };
            await this.ready;
            const { error, state, runAt } = await runDrain({
              consumer: taskConsumer,
              topic,
              state: normalizeDrainState(taskInstance.state),
              subscription: this.subscriptions.get(subscriptionKey(taskConsumer, topic)),
              store: this.store!,
              logger: this.logger,
              signal,
            });
            const result = { state: { ...state }, runAt };
            return error
              ? { ...result, error: createTaskRunError(error, TaskErrorSource.USER) }
              : result;
          },
        }),
      },
    });
  }
}
