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
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { EventRouterConfig } from './config';
import { Dispatcher } from './dispatcher';
import { EventRouter } from './event_router';
import { EventTypeRegistry } from './event_type_registry';
import {
  createExampleListener,
  exampleEventType,
  registerExampleTaskType,
} from './example_listener';
import { ListenerRegistry } from './listener_registry';
import { registerPublishEventsRoute } from './routes/publish_events';
import type {
  EventRouterSetup,
  EventRouterSetupDeps,
  EventRouterStart,
  EventRouterStartDeps,
} from './types';

/**
 * Everything this plugin owns is in memory: two registries and a dispatcher.
 * There is no index to install, no cursor to persist and no timer to cancel,
 * which is why there is no `stop` lifecycle. Durability belongs to the work
 * listeners enqueue, not to the router.
 */
export class EventRouterPlugin
  implements Plugin<EventRouterSetup, EventRouterStart, EventRouterSetupDeps, EventRouterStartDeps>
{
  private readonly logger: Logger;
  private readonly config: EventRouterConfig;
  private readonly eventTypes: EventTypeRegistry;
  private readonly listeners: ListenerRegistry;
  private readonly eventRouter: EventRouter;
  private taskManager?: TaskManagerStartContract;

  constructor(initializerContext: PluginInitializerContext<EventRouterConfig>) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
    this.eventTypes = new EventTypeRegistry();
    this.listeners = new ListenerRegistry();
    this.eventRouter = new EventRouter({
      eventTypes: this.eventTypes,
      dispatcher: new Dispatcher({
        listeners: this.listeners,
        logger: this.logger.get('dispatcher'),
        listenerTimeoutMs: this.config.listenerTimeout.asMilliseconds(),
      }),
    });
  }

  public setup(core: CoreSetup, plugins: EventRouterSetupDeps): EventRouterSetup {
    registerPublishEventsRoute({
      router: core.http.createRouter(),
      eventRouter: this.eventRouter,
      maxEventsPerRequest: this.config.maxEventsPerRequest,
    });

    this.setupExample(plugins.taskManager);

    return {
      registerEventType: (definition) => this.eventTypes.register(definition),
      registerListener: (definition) => this.listeners.register(definition),
    };
  }

  public start(core: CoreStart, plugins: EventRouterStartDeps): EventRouterStart {
    this.taskManager = plugins.taskManager;

    this.logger.debug(
      `Routing ${this.eventTypes.getTypes().length} event type(s) to ${
        this.listeners.getIds().length
      } listener(s)`
    );

    return {
      publish: (params, request) => this.eventRouter.publish(params, request),
    };
  }

  private setupExample(taskManager: TaskManagerSetupContract | undefined): void {
    if (!taskManager) {
      if (this.config.exampleListener.enabled) {
        this.logger.warn(
          'xpack.eventRouter.exampleListener.enabled is true but the taskManager plugin is unavailable, so the example listener was not registered.'
        );
      }
      return;
    }

    // Registered unconditionally so the set of task types does not vary with
    // config; nothing schedules it unless the example listener is enabled.
    registerExampleTaskType({ taskManager, logger: this.logger.get('example') });

    if (!this.config.exampleListener.enabled) {
      return;
    }

    this.eventTypes.register(exampleEventType);
    this.listeners.register(
      createExampleListener({
        getTaskManager: () => {
          if (!this.taskManager) {
            throw new Error('Task Manager is not available until the start lifecycle has run');
          }
          return this.taskManager;
        },
      })
    );
  }
}
