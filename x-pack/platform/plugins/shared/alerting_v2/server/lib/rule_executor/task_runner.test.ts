/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { RunContext } from '@kbn/task-manager-plugin/server/task';
import type { ESQLSearchResponse } from '@kbn/es-types';

import type { RuleSavedObjectAttributes } from '../../saved_objects';
import { ALERT_EVENTS_DATA_STREAM } from '../../resources/alert_events';
import { RuleExecutorTaskRunner } from './task_runner';
import { createMockLoggerService } from '../services/logger_service/logger_service.mock';
import { createMockResourceManager } from '../services/resource_service/resource_manager.mock';
import { createMockRulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import { createMockQueryService } from '../services/query_service/query_service.mock';
import { createMockStorageService } from '../services/storage_service/storage_service.mock';

describe('RuleExecutorTaskRunner', () => {
  const baseRuleAttributes: RuleSavedObjectAttributes = {
    name: 'test-rule',
    tags: [],
    schedule: { custom: '1m' },
    enabled: true,
    query: 'FROM logs-* | LIMIT 1',
    timeField: '@timestamp',
    lookbackWindow: '1m',
    groupingKey: [],
    createdBy: 'elastic',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedBy: 'elastic',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  const taskInstance = {
    id: 'task-1',
    params: { ruleId: 'rule-1', spaceId: 'default' },
    state: { foo: 'bar' },
    scheduledAt: '2025-01-01T00:00:00.000Z',
    startedAt: new Date('2025-01-01T00:00:10.000Z'),
  } as unknown as RunContext['taskInstance'];

  const createRunner = ({
    ruleAttributes = baseRuleAttributes,
    esqlResponse = {
      columns: [{ name: 'host.name' }],
      values: [['host-a']],
    } as ESQLSearchResponse,
  }: {
    ruleAttributes?: RuleSavedObjectAttributes;
    esqlResponse?: ESQLSearchResponse;
  } = {}) => {
    const { loggerService } = createMockLoggerService();
    const resourcesService = createMockResourceManager();
    const rulesSavedObjectService = createMockRulesSavedObjectService();
    const queryService = createMockQueryService();
    const storageService = createMockStorageService();

    rulesSavedObjectService.get.mockResolvedValue({
      id: 'rule-1',
      attributes: ruleAttributes,
    });
    queryService.executeQuery.mockResolvedValue(esqlResponse);

    const runner = new RuleExecutorTaskRunner(
      loggerService,
      resourcesService,
      rulesSavedObjectService,
      queryService,
      storageService
    );

    return {
      runner,
      loggerService,
      resourcesService,
      rulesSavedObjectService,
      queryService,
      storageService,
    };
  };

  it('returns early when rule is disabled', async () => {
    const { runner, resourcesService, rulesSavedObjectService, queryService, storageService } =
      createRunner({
        ruleAttributes: { ...baseRuleAttributes, enabled: false },
      });

    const res = await runner.run({
      taskInstance,
      abortController: new AbortController(),
    });

    expect(res).toEqual({ state: taskInstance.state });
    expect(resourcesService.waitUntilReady).toHaveBeenCalled();
    expect(rulesSavedObjectService.get).toHaveBeenCalledWith('rule-1', 'default');
    expect(queryService.executeQuery).not.toHaveBeenCalled();
    expect(storageService.bulkIndexDocs).not.toHaveBeenCalled();
  });

  it('returns early when rule is not found', async () => {
    const { runner, resourcesService, rulesSavedObjectService, queryService, storageService } =
      createRunner();

    rulesSavedObjectService.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError('alerting_rule', 'rule-1')
    );

    const res = await runner.run({
      taskInstance,
      abortController: new AbortController(),
    });

    expect(res).toEqual({ state: taskInstance.state });
    expect(resourcesService.waitUntilReady).toHaveBeenCalled();
    expect(rulesSavedObjectService.get).toHaveBeenCalledWith('rule-1', 'default');
    expect(queryService.executeQuery).not.toHaveBeenCalled();
    expect(storageService.bulkIndexDocs).not.toHaveBeenCalled();
  });

  it('throws when get fails', async () => {
    const { runner, rulesSavedObjectService } = createRunner();
    const error = new Error('boom');

    rulesSavedObjectService.get.mockRejectedValueOnce(error);

    await expect(
      runner.run({
        taskInstance,
        abortController: new AbortController(),
      })
    ).rejects.toThrow(error);
  });

  it('throws when query execution fails', async () => {
    const { runner, queryService } = createRunner();
    const error = new Error('query failed');

    queryService.executeQuery.mockRejectedValueOnce(error);

    await expect(
      runner.run({
        taskInstance,
        abortController: new AbortController(),
      })
    ).rejects.toThrow(error);
  });

  it('throws a cancelled execution error when query is aborted', async () => {
    const { runner, queryService } = createRunner();
    const abortController = new AbortController();
    abortController.abort();

    queryService.executeQuery.mockRejectedValueOnce(new Error('aborted'));

    await expect(
      runner.run({
        taskInstance,
        abortController,
      })
    ).rejects.toThrow('Search has been aborted due to cancelled execution');
  });

  it('executes the rule and writes alert events', async () => {
    const { runner, resourcesService, rulesSavedObjectService, queryService, storageService } =
      createRunner();
    const abortController = new AbortController();

    const res = await runner.run({
      taskInstance,
      abortController,
    });

    expect(res).toEqual({ state: {} });
    expect(resourcesService.waitUntilReady).toHaveBeenCalled();
    expect(rulesSavedObjectService.get).toHaveBeenCalledWith('rule-1', 'default');
    expect(queryService.executeQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: baseRuleAttributes.query,
        abortSignal: abortController.signal,
      })
    );
    expect(storageService.bulkIndexDocs).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ALERT_EVENTS_DATA_STREAM,
        docs: expect.any(Array),
        getId: expect.any(Function),
      })
    );
    const [{ docs }] = storageService.bulkIndexDocs.mock.calls[0];
    expect(docs).toHaveLength(1);
  });
});
