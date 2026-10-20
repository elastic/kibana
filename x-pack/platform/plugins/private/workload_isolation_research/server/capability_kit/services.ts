/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsUpdateOptions,
} from '@kbn/core-saved-objects-api-server';
import {
  AgentManager,
  createResearchEsClient,
} from '@kbn/core-elasticsearch-client-server-internal';
import type { ResearchEsCapability } from '@kbn/core-elasticsearch-client-server-internal';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { decode } from './codecs';
import type { CodecInput } from './codecs';
import type { Binding } from './host';
import type { WorkerContext } from './protocol';

const record = (value: CodecInput): Record<string, CodecInput> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected capability arguments');
  return value as Record<string, CodecInput>;
};
const text = (value: CodecInput): string => {
  if (typeof value !== 'string' || !value || value.length > 10000)
    throw new Error('Expected bounded capability identifier');
  return value;
};
const scopedOptions = (value: CodecInput): Record<string, CodecInput> => {
  const options = value === undefined ? {} : record(value);
  if (['namespace', 'namespaces', 'spaceId'].some((key) => key in options)) {
    throw new Error('A scoped capability cannot select a different space');
  }
  return options;
};

/** Binds the already-authenticated, already-space-scoped Core SO client, retaining its wrappers. */
export const bindSavedObjects = (
  client: SavedObjectsClientContract,
  scope: { readonly principal: string; readonly space: string }
): Binding => ({
  lever: 'capability_bundle',
  handler: async (operation, args, bundle) => {
    if (bundle.principal !== scope.principal || bundle.space !== scope.space)
      throw new Error('Foreign SO capability');
    const params = record(args);
    const options = scopedOptions(params.options);
    switch (operation) {
      case 'get':
        return client.get(text(params.type), text(params.id), options);
      case 'resolve':
        return client.resolve(text(params.type), text(params.id), options);
      case 'create':
        return client.create(
          text(params.type),
          record(params.attributes),
          options as SavedObjectsCreateOptions
        );
      case 'update':
        return client.update(
          text(params.type),
          text(params.id),
          record(params.attributes),
          options as SavedObjectsUpdateOptions
        );
      case 'delete':
        return client.delete(text(params.type), text(params.id), options);
      case 'find':
        return client.find({ ...options, type: text(options.type) });
      default:
        throw new Error('SO operation not allowlisted');
    }
  },
});

/** Keeps Task Manager scheduling and queue authority on main. */
export const bindTaskManager = (
  client: Pick<TaskManagerStartContract, 'schedule' | 'fetch' | 'runSoon'>
): Binding => ({
  lever: 'capability_bundle',
  handler: async (operation, args) => {
    const params = record(args);
    switch (operation) {
      case 'schedule':
        return client.schedule({
          ...params,
          taskType: text(params.taskType),
          params: record(params.params),
          state: record(params.state),
        });
      case 'fetch':
        return client.fetch(params as Parameters<TaskManagerStartContract['fetch']>[0]);
      case 'runSoon':
        return client.runSoon(text(params.id));
      default:
        throw new Error('TM operation not allowlisted');
    }
  },
});

/** Sends bounded log records; capability/credential data is never included in boundary telemetry. */
export const bindLogger = (logger: Logger): Binding => ({
  lever: 'capability_bundle',
  handler: async (operation, args) => {
    const params = record(args);
    const message =
      typeof params.message === 'string' ? params.message.slice(0, 10000) : 'Invalid worker log';
    switch (operation) {
      case 'trace':
        logger.trace(message);
        break;
      case 'debug':
        logger.debug(message);
        break;
      case 'info':
        logger.info(message);
        break;
      case 'warn':
        logger.warn(message);
        break;
      case 'error':
        logger.error(message);
        break;
      case 'fatal':
        logger.fatal(message);
        break;
      default:
        throw new Error('Logger level not allowlisted');
    }
  },
});

const createBufferedLogger = (
  context: WorkerContext
): { logger: Logger; flush: () => Promise<void> } => {
  const messages: Array<{ level: string; message: string }> = [];
  const append = (level: string, message: string | Error | (() => string)): void => {
    if (messages.length < 100)
      messages.push({
        level,
        message: (typeof message === 'function' ? message() : String(message)).slice(0, 10000),
      });
  };
  const logger: Logger = {
    trace: (message) => append('trace', message),
    debug: (message) => append('debug', message),
    info: (message) => append('info', message),
    warn: (message) => append('warn', message),
    error: (message) => append('error', message),
    fatal: (message) => append('fatal', message),
    log: (entry) => append(entry.level.id, entry.message),
    isLevelEnabled: () => true,
    get: () => logger,
  };
  return {
    logger,
    flush: async () => {
      const pending = messages.splice(0);
      if (context.bundle.grants.logger)
        for (const message of pending)
          await context.call('logger', message.level, { message: message.message });
    },
  };
};

const silent = (): void => {};
const agentLogger: Logger = {
  trace: silent,
  debug: silent,
  info: silent,
  warn: silent,
  error: silent,
  fatal: silent,
  log: silent,
  isLevelEnabled: () => false,
  get: () => agentLogger,
};
let isolateAgentManager: AgentManager | undefined;
const getAgentManager = (): AgentManager => {
  // Metrics callbacks must never retain a per-run logger/bundle/credential closure.
  isolateAgentManager ??= new AgentManager(agentLogger, { dnsCacheTtlInSeconds: 0 });
  return isolateAgentManager;
};

/** Constructs worker-owned ES data access plus explicit scoped SO/TM bridges for one run. */
export const createRunServices = (context: WorkerContext) => {
  const { logger, flush } = createBufferedLogger(context);
  const data = context.bundle.data ? record(decode(context.bundle.data)) : {};
  const capability = data.elasticsearch as ResearchEsCapability | undefined;
  const elasticsearch = capability
    ? createResearchEsClient(capability, logger, getAgentManager())
    : undefined;
  return {
    logger,
    elasticsearch,
    savedObjects: {
      get: (type: string, id: string, options?: object) =>
        context.call('savedObjects', 'get', { type, id, options }),
      resolve: (type: string, id: string, options?: object) =>
        context.call('savedObjects', 'resolve', { type, id, options }),
      create: (type: string, attributes: object, options?: object) =>
        context.call('savedObjects', 'create', { type, attributes, options }),
      update: (type: string, id: string, attributes: object, options?: object) =>
        context.call('savedObjects', 'update', { type, id, attributes, options }),
      delete: (type: string, id: string, options?: object) =>
        context.call('savedObjects', 'delete', { type, id, options }),
      find: (options: object) => context.call('savedObjects', 'find', { options }),
    },
    taskManager: {
      schedule: (task: Parameters<TaskManagerStartContract['schedule']>[0]) =>
        context.call('taskManager', 'schedule', task),
      fetch: (options: Parameters<TaskManagerStartContract['fetch']>[0]) =>
        context.call('taskManager', 'fetch', options),
      runSoon: (id: string) => context.call('taskManager', 'runSoon', { id }),
    },
    close: async (): Promise<void> => {
      await elasticsearch?.close();
      await flush();
    },
  };
};
