/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV10 } from '../schemas';

/**
 * Adds the task_summary field to the cases SO.
 * This field is a denormalized summary of task counts per status and the
 * next due date, maintained by the CaseTaskService on every task mutation.
 * Default value for existing cases is null (no tasks).
 */
export const modelVersion10: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        task_summary: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            open: { type: 'integer' },
            in_progress: { type: 'integer' },
            completed: { type: 'integer' },
            cancelled: { type: 'integer' },
            next_due_date: { type: 'date' },
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV10.extends({}, { unknowns: 'ignore' }),
  },
};
