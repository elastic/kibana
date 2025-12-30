/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { SavedObjectsClientContract, Logger, KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import { ESQL_RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { RawEsqlRule } from '../../../../saved_objects';
import { ensureRuleExecutorTaskScheduled } from '../../../../rule_executor/schedule';
import { createEsqlRuleDataSchema } from './schemas';
import type { CreateEsqlRuleParams, EsqlRuleResponse } from './types';

export async function createEsqlRule(
  context: {
    logger: Logger;
    request: KibanaRequest;
    taskManager: TaskManagerStartContract;
    savedObjectsClient: SavedObjectsClientContract;
    spaceId: string;
    namespace?: string;
    getUserName: () => Promise<string | null>;
  },
  { data, options }: CreateEsqlRuleParams
): Promise<EsqlRuleResponse> {
  try {
    createEsqlRuleDataSchema.validate(data);
  } catch (error) {
    throw Boom.badRequest(`Error validating create ES|QL rule data - ${error.message}`);
  }

  const id = options?.id ?? SavedObjectsUtils.generateId();
  const username = await context.getUserName();
  const nowIso = new Date().toISOString();

  const attributes: RawEsqlRule = {
    name: data.name,
    tags: data.tags ?? [],
    schedule: data.schedule,
    enabled: data.enabled,
    esql: data.esql,
    timeField: data.timeField,
    lookbackWindow: data.lookbackWindow,
    groupKey: data.groupKey ?? [],
    scheduledTaskId: null,
    createdBy: username,
    createdAt: nowIso,
    updatedBy: username,
    updatedAt: nowIso,
  };

  try {
    await context.savedObjectsClient.create<RawEsqlRule>(ESQL_RULE_SAVED_OBJECT_TYPE, attributes, {
      id,
      overwrite: false,
    });
  } catch (e) {
    if (SavedObjectsErrorHelpers.isConflictError(e)) {
      throw Boom.conflict(`ES|QL rule with id "${id}" already exists`);
    }
    throw e;
  }

  let scheduledTaskId: string | null = null;
  if (attributes.enabled) {
    try {
      const { id: taskId } = await ensureRuleExecutorTaskScheduled({
        services: { taskManager: context.taskManager },
        input: {
          ruleId: id,
          spaceId: context.spaceId,
          schedule: { interval: attributes.schedule },
          request: context.request,
        },
      });
      scheduledTaskId = taskId;
      await context.savedObjectsClient.update<RawEsqlRule>(ESQL_RULE_SAVED_OBJECT_TYPE, id, {
        scheduledTaskId,
      });
    } catch (e) {
      await context.savedObjectsClient.delete(ESQL_RULE_SAVED_OBJECT_TYPE, id).catch(() => {});
      throw e;
    }
  }

  return { id, ...attributes, scheduledTaskId };
}
