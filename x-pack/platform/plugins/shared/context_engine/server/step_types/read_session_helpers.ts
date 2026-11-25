/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { DreamingStepDependencies } from './helpers';

/**
 * Fails the step when the workflow user cannot read AI indices in the space, or the AI index is
 * gone. Returns false, so the step reads nothing, while Context Engine or its memory setting is off.
 */
export const assertAiIndexReadable = async (
  {
    getAiIndexService,
    isContextEngineEnabled,
    isMemoryEnabled,
    checkReadPrivilege,
  }: DreamingStepDependencies,
  context: StepHandlerContext,
  aiIndexId: string,
  spaceId: string
): Promise<boolean> => {
  if (!(await checkReadPrivilege(context.contextManager.getFakeRequest(), spaceId))) {
    throw new ExecutionError({
      type: 'PermissionError',
      message: 'Insufficient privileges to read AI indices',
    });
  }
  if (!(await isContextEngineEnabled(spaceId)) || !(await isMemoryEnabled())) {
    return false;
  }
  try {
    await getAiIndexService().get(aiIndexId, spaceId);
  } catch (error) {
    if (error instanceof AiIndexNotFoundError) {
      throw new ExecutionError({
        type: 'NotFoundError',
        message: `AI index '${aiIndexId}' not found`,
      });
    }
    throw error;
  }
  return true;
};
