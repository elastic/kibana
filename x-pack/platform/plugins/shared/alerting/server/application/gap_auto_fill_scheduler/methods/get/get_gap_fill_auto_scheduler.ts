/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { GetGapFillAutoSchedulerParams } from './types';
import type { GapFillAutoSchedulerResponse } from '../../result/types';
import { getGapFillAutoSchedulerSchema } from './schemas';
import { transformSavedObjectToGapAutoFillSchedulerResult } from '../../transforms';
import type { GapAutoFillSchedulerSavedObjectAttributes } from '../../transforms';

export async function getGapFillAutoScheduler(
  context: RulesClientContext,
  params: GetGapFillAutoSchedulerParams
): Promise<GapFillAutoSchedulerResponse> {
  // Validate input parameters
  getGapFillAutoSchedulerSchema.validate(params);

  const { GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE } = await import('../../../../saved_objects');
  const savedObject = await context.unsecuredSavedObjectsClient.get(
    GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
    params.id
  );

  console.log('savedObject', savedObject);

  // Transform SavedObject to response format using the transform function
  return transformSavedObjectToGapAutoFillSchedulerResult({
    savedObject: savedObject as SavedObject<GapAutoFillSchedulerSavedObjectAttributes>,
  });
}
