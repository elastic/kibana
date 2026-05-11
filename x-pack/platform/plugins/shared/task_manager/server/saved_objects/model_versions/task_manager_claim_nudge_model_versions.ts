/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { taskManagerClaimNudgeSchemaV1 } from '../schemas/task_manager_claim_nudge';

export const taskManagerClaimNudgeModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      create: taskManagerClaimNudgeSchemaV1,
    },
  },
};
