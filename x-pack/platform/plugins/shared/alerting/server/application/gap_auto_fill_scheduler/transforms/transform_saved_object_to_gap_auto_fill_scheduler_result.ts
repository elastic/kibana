/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';

import type { GapFillAutoSchedulerResponse } from '../result/types';
import type { GapAutoFillSchedulerSO } from '../../../data/gap_auto_fill_scheduler/types/gap_fill_auto_scheduler';

export interface TransformSavedObjectToGapAutoFillSchedulerResultOpts {
  savedObject: SavedObject<GapAutoFillSchedulerSO>;
}

export const transformSavedObjectToGapAutoFillSchedulerResult = ({
  savedObject,
}: TransformSavedObjectToGapAutoFillSchedulerResultOpts): GapFillAutoSchedulerResponse => {
  const { id, attributes } = savedObject;

  if (!id) {
    throw new Error('Malformed saved object - Missing "id".');
  }

  if (!attributes) {
    throw new Error('Malformed saved object - Missing "attributes".');
  }

  return {
    id,
    name: attributes.name,
    enabled: attributes.enabled,
    schedule: attributes.schedule,
    gapFillRange: attributes.gapFillRange,
    maxBackfills: attributes.maxBackfills,
    amountOfRetries: attributes.amountOfRetries,
    createdBy: attributes.createdBy,
    updatedBy: attributes.updatedBy,
    createdAt: attributes.createdAt,
    updatedAt: attributes.updatedAt,
    scheduledTaskId: attributes.scheduledTaskId || '',
  };
};
