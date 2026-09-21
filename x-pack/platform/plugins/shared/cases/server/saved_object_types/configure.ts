/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CASE_CONFIGURE_SAVED_OBJECT } from '../../common/constants';
import { configureMigrations } from './migrations';

/**
 * The comments in the mapping indicate the additional properties that are stored in Elasticsearch but are not indexed.
 * Remove these comments when https://github.com/elastic/kibana/issues/152756 is resolved.
 */

export const caseConfigureSavedObjectType: SavedObjectsType = {
  name: CASE_CONFIGURE_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: {
    dynamic: false,
    properties: {
      created_at: {
        type: 'date',
      },
      /*
      created_by: {
        properties: {
          email: {
            type: 'keyword',
          },
          username: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
          profile_uid: {
            type: 'keyword',
          },
        },
      },
      connector: {
        properties: {
          name: {
            type: 'text',
          },
          type: {
            type: 'keyword',
          },
          fields: {
            properties: {
              key: {
                type: 'text',
              },
              value: {
                type: 'text',
              },
            },
          },
        },
      },
      */
      closure_type: {
        type: 'keyword',
      },
      owner: {
        type: 'keyword',
      },
      extractObservables: {
        type: 'boolean',
      },
      /*
      updated_at: {
        type: 'date',
      },
      updated_by: {
        properties: {
          email: {
            type: 'keyword',
          },
          username: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
          profile_uid: {
            type: 'keyword',
          },
        },
      },
      */
    },
  },
  migrations: configureMigrations,
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: (attrs) => attrs,
        create: schema.object({}, { unknowns: 'allow' }),
      },
    },
    '2': {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            extractObservables: {
              type: 'boolean',
            },
          },
        },
        {
          type: 'data_backfill',
          backfillFn: (doc) => {
            if (doc.attributes.extractObservables !== undefined) {
              return { attributes: {} };
            }
            // Match configure service / Settings UI default-on for documents that lack the field.
            return { attributes: { extractObservables: true } };
          },
        },
      ],
      schemas: {
        forwardCompatibility: schema.object(
          {
            extractObservables: schema.maybe(schema.boolean()),
          },
          { unknowns: 'ignore' }
        ),
        create: schema.object(
          {
            extractObservables: schema.maybe(schema.boolean()),
          },
          { unknowns: 'allow' }
        ),
      },
    },
  },
};
