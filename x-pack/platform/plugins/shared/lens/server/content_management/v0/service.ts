/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentManagementServicesDefinition } from '@kbn/object-versioning';

import { lensCMGetResultSchemaV0 } from './schema';

export const serviceDefinition = {
  get: {
    out: {
      result: {
        // Used to validate existing SO before transforming to v1
        schema: lensCMGetResultSchemaV0,
      },
    },
  },
} satisfies ContentManagementServicesDefinition;
