/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { DreamingStepDependencies } from './helpers';

/**
 * The AI index a read-only ontology step works on. Fails when the workflow user cannot read AI
 * indices or the AI index is gone; `undefined` while Context Engine or its memory setting is off,
 * so a run that started before they were turned off reads nothing.
 */
export const getAiIndexForStep = async (
  {
    getAiIndexService,
    isContextEngineEnabled,
    isMemoryEnabled,
    checkReadPrivilege,
  }: DreamingStepDependencies,
  { request, aiIndexId, spaceId }: { request: KibanaRequest; aiIndexId: string; spaceId: string }
): Promise<AiIndexItem | undefined> => {
  if (!(await checkReadPrivilege(request, spaceId))) {
    throw new ExecutionError({
      type: 'PermissionError',
      message: 'Insufficient privileges to read AI indices',
    });
  }
  if (!(await isContextEngineEnabled(spaceId)) || !(await isMemoryEnabled())) {
    return undefined;
  }
  try {
    return await getAiIndexService().get(aiIndexId, spaceId);
  } catch (error) {
    if (error instanceof AiIndexNotFoundError) {
      throw new ExecutionError({
        type: 'NotFoundError',
        message: `AI index '${aiIndexId}' not found`,
      });
    }
    throw error;
  }
};
