/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

import { SpacesSavedObjectMappings } from './mappings';
import { spaceMigrations } from './migrations';
import { SpacesSavedObjectSchemas } from './schemas';
import { solutionSchema } from '../lib/space_schema';

const spaceCreateSchemaWithSolution = SpacesSavedObjectSchemas['8.8.0'].extends({
  solution: schema.maybe(solutionSchema),
});

const spaceCreateSchemaWithSolutionSetup = spaceCreateSchemaWithSolution.extends({
  solutionSetupRequired: schema.maybe(schema.boolean()),
});

/** The `space` saved object type, registered by the plugin and by a task pod. */
export const spaceSavedObjectType: SavedObjectsType = {
  name: 'space',
  hidden: true,
  namespaceType: 'agnostic',
  mappings: SpacesSavedObjectMappings,
  schemas: SpacesSavedObjectSchemas,
  migrations: {
    '6.6.0': spaceMigrations.migrateTo660,
  },
  modelVersions: {
    1: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            solution: { type: 'keyword' },
          },
        },
      ],
      schemas: {
        create: spaceCreateSchemaWithSolution,
      },
    },
    2: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            disabledFeatures: { type: 'keyword' },
          },
        },
      ],
    },
    3: {
      changes: [],
      schemas: {
        create: spaceCreateSchemaWithSolutionSetup,
        forwardCompatibility: spaceCreateSchemaWithSolutionSetup.extends(
          {},
          { unknowns: 'ignore' }
        ),
      },
    },
  },
};
