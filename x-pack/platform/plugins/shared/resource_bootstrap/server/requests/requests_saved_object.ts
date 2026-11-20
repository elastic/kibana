/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import { REQUESTS_SAVED_OBJECT_TYPE } from '../../common';

const requestsAttributesSchema = schema.object({
  count: schema.number({ min: 0 }),
});

/** Single document counting the runs that starts asked for; read by id, so nothing is indexed. */
export const requestsSavedObjectType: SavedObjectsType = {
  name: REQUESTS_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: requestsAttributesSchema.extends({}, { unknowns: 'ignore' }),
        create: requestsAttributesSchema,
      },
    },
  },
};
