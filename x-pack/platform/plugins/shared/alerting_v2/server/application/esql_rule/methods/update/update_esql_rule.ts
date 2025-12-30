/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { SavedObjectsClientContract, Logger, KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import { ESQL_RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { RawEsqlRule } from '../../../../saved_objects';
import {
  ensureRuleExecutorTaskScheduled,
  getRuleExecutorTaskId,
} from '../../../../rule_executor/schedule';
import { updateEsqlRuleDataSchema } from './schemas';
import type { UpdateEsqlRuleData } from './types';
import type { EsqlRuleResponse } from '../create/types';

export async function updateEsqlRule(
  context: {
    logger: Logger;
    request: KibanaRequest;
    taskManager: TaskManagerStartContract;
    savedObjectsClient: SavedObjectsClientContract;
    spaceId: string;
    namespace?: string;
    getUserName: () => Promise<string | null>;
  },
  { id, data }: { id: string; data: UpdateEsqlRuleData }
): Promise<EsqlRuleResponse> {
  try {
    updateEsqlRuleDataSchema.validate(data);
  } catch (error) {
    throw Boom.badRequest(`Error validating update ES|QL rule data - ${error.message}`);
  }

  const username = await context.getUserName();
  const nowIso = new Date().toISOString();

  let existingAttrs: RawEsqlRule;
  let existingVersion: string | undefined;
  try {
    const doc = await context.savedObjectsClient.get<RawEsqlRule>(ESQL_RULE_SAVED_OBJECT_TYPE, id);
    existingAttrs = doc.attributes;
    existingVersion = doc.version;
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      throw Boom.notFound(`ES|QL rule with id "${id}" not found`);
    }
    throw e;
  }

  const wasEnabled = Boolean(existingAttrs.enabled);
  const willBeEnabled = data.enabled !== undefined ? Boolean(data.enabled) : wasEnabled;

  let nextAttrs: RawEsqlRule = {
    ...existingAttrs,
    ...data,
    updatedBy: username,
    updatedAt: nowIso,
  };

  // Disable transition: remove task and clear task id.
  if (wasEnabled && !willBeEnabled) {
    const taskId =
      existingAttrs.scheduledTaskId ??
      getRuleExecutorTaskId({ ruleId: id, spaceId: context.spaceId });
    await context.taskManager.removeIfExists(taskId);
    nextAttrs = { ...nextAttrs, scheduledTaskId: null };
  }

  // If enabled, ensure task exists and schedule is up-to-date (also handles schedule changes).
  if (willBeEnabled) {
    const { id: taskId } = await ensureRuleExecutorTaskScheduled({
      services: { taskManager: context.taskManager },
      input: {
        ruleId: id,
        spaceId: context.spaceId,
        schedule: { interval: nextAttrs.schedule },
        request: context.request,
      },
    });
    nextAttrs = { ...nextAttrs, scheduledTaskId: taskId };
  }

  try {
    await context.savedObjectsClient.create<RawEsqlRule>(ESQL_RULE_SAVED_OBJECT_TYPE, nextAttrs, {
      id,
      overwrite: true,
      ...(existingVersion ? { version: existingVersion } : {}),
    });
  } catch (e) {
    if (SavedObjectsErrorHelpers.isConflictError(e)) {
      throw Boom.conflict(`ES|QL rule with id "${id}" has already been updated by another user`);
    }
    throw e;
  }

  return { id, ...nextAttrs, scheduledTaskId: nextAttrs.scheduledTaskId ?? null };
}
