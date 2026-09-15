/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';

jest.mock('../infra/feature_flags', () => ({ isDualProcessEnabled: jest.fn() }));
jest.mock('./should_delete_orphaned_task', () => ({
  shouldDeleteOrphanedEntityStoreTask: jest.fn().mockResolvedValue(false),
}));
jest.mock('./factories', () => ({ createLogsExtractionClient: jest.fn() }));

import { isDualProcessEnabled } from '../infra/feature_flags';
import { createLogsExtractionClient } from './factories';
import {
  getExtractEntityTaskConfig,
  getExtractEntityTaskId,
  getNewSchedule,
  registerExtractEntityTasks,
} from './extract_entity_task';
import type * as types from '../types';
import { EXTRACTION_MODE } from '../../common/domain/definitions/entity_schema';

const createTaskInstance = (schedule?: ConcreteTaskInstance['schedule']): ConcreteTaskInstance =>
  ({
    id: 'entity_store:v2:extract_entity_task:host:default',
    taskType: 'entity_store:v2:extract_entity_task:host',
    schedule,
  } as ConcreteTaskInstance);

describe('getNewSchedule', () => {
  it('returns a schedule when frequency differs from the current interval', () => {
    expect(getNewSchedule('22m', createTaskInstance({ interval: '1m' }))).toEqual({
      schedule: { interval: '22m' },
    });
  });

  it('returns undefined when frequency matches the current interval', () => {
    expect(getNewSchedule('1m', createTaskInstance({ interval: '1m' }))).toBeUndefined();
  });

  it('returns a schedule when the task has no interval', () => {
    expect(getNewSchedule('1m', createTaskInstance())).toEqual({
      schedule: { interval: '1m' },
    });
  });
});

describe('extract entity task identity', () => {
  it('single and priority share one task; nonPriority has its own', () => {
    expect(getExtractEntityTaskId('user', 'default', EXTRACTION_MODE.priority)).toBe(
      getExtractEntityTaskId('user', 'default', EXTRACTION_MODE.single)
    );
    expect(getExtractEntityTaskId('user', 'default', EXTRACTION_MODE.nonPriority)).not.toBe(
      getExtractEntityTaskId('user', 'default', EXTRACTION_MODE.single)
    );
  });

  it('defaults to the single task id, so existing callers are unchanged', () => {
    expect(getExtractEntityTaskId('user', 'default')).toBe(
      'entity_store:v2:extract_entity_task:user:default'
    );
  });

  it('each process resolves its own timeout and interval', () => {
    const priority = getExtractEntityTaskConfig(EXTRACTION_MODE.priority);
    const nonPriority = getExtractEntityTaskConfig(EXTRACTION_MODE.nonPriority);

    expect(nonPriority.type).not.toBe(priority.type);
    expect(nonPriority.timeout).toBeDefined();
    expect(nonPriority.interval).toBeDefined();
  });
});

describe('registerExtractEntityTasks', () => {
  const register = (entityTypes: Array<'user' | 'host'>) => {
    const registerTaskDefinitions = jest.fn();
    registerExtractEntityTasks({
      taskManager: { registerTaskDefinitions } as unknown as TaskManagerSetupContract,
      logger: loggerMock.create(),
      entityTypes,
      core: {} as types.EntityStoreCoreSetup,
      isServerless: false,
    });
    return registerTaskDefinitions.mock.calls.flatMap((call) => Object.keys(call[0]));
  };

  /** Definitions are registered during setup, before the flag is readable, so registration must
   * not depend on it. Only execution does. */
  it('registers a non-priority task for a dual-capable type, regardless of the flag', () => {
    const registered = register(['user']);

    expect(registered).toContain('entity_store:v2:extract_entity_task:user');
    expect(registered).toContain('entity_store:v2:extract_entity_non_priority_task:user');
  });

  it('registers only the single task for a type with no priority variant', () => {
    const registered = register(['host']);

    expect(registered).toEqual(['entity_store:v2:extract_entity_task:host']);
  });
});

/**
 * Registration is unconditional, so the flag has to be read per run: it can be flipped while a
 * task is already scheduled. Non-priority extraction exists only in dual-process mode, so with the
 * flag off the run must do nothing rather than fall back to another mode.
 */
describe('feature flag gates non-priority execution', () => {
  const mockIsDualProcessEnabled = isDualProcessEnabled as jest.MockedFunction<
    typeof isDualProcessEnabled
  >;
  const mockCreateClient = createLogsExtractionClient as jest.MockedFunction<
    typeof createLogsExtractionClient
  >;

  const runTaskFor = async (taskTypeSuffix: string, flagEnabled: boolean) => {
    jest.clearAllMocks();
    mockIsDualProcessEnabled.mockResolvedValue(flagEnabled);
    mockCreateClient.mockResolvedValue({
      logsExtractionClient: {
        extractLogs: jest.fn().mockResolvedValue({ success: true, isRemote: false, count: 0 }),
        getMergedConfigForType: jest.fn().mockResolvedValue({ frequency: '1m' }),
      },
    } as unknown as Awaited<ReturnType<typeof createLogsExtractionClient>>);

    const definitions: Record<string, { createTaskRunner: Function }> = {};
    registerExtractEntityTasks({
      taskManager: {
        registerTaskDefinitions: (defs: Record<string, { createTaskRunner: Function }>) =>
          Object.assign(definitions, defs),
      } as unknown as TaskManagerSetupContract,
      logger: loggerMock.create(),
      entityTypes: ['user'],
      core: {
        getStartServices: jest.fn().mockResolvedValue([{ featureFlags: {} }]),
      } as unknown as types.EntityStoreCoreSetup,
      isServerless: false,
    });

    const definition = definitions[`entity_store:v2:${taskTypeSuffix}:user`];
    await definition
      .createTaskRunner({
        taskInstance: { id: 'task-id', state: { namespace: 'default' } },
        fakeRequest: {},
        signal: new AbortController().signal,
      })
      .run();
  };

  it('does not extract when the flag is off', async () => {
    await runTaskFor('extract_entity_non_priority_task', false);

    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('extracts in nonPriority mode when the flag is on', async () => {
    await runTaskFor('extract_entity_non_priority_task', true);

    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({ extractionMode: EXTRACTION_MODE.nonPriority })
    );
  });

  it('the priority task still runs when the flag is off, as single', async () => {
    await runTaskFor('extract_entity_task', false);

    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({ extractionMode: EXTRACTION_MODE.single })
    );
  });

  it('the priority task runs as priority when the flag is on', async () => {
    await runTaskFor('extract_entity_task', true);

    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({ extractionMode: EXTRACTION_MODE.priority })
    );
  });
});
