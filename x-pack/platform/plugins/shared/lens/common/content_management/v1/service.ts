/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentManagementServicesDefinition } from '@kbn/object-versioning';

import {
  lensCMGetResultSchema,
  lensItemAttributesSchema,
  lensCMCreateOptionsSchema,
  lensCMCreateResultSchema,
  lensCMSearchOptionsSchema,
  lensCMUpdateResultSchema,
  lensCMSearchResultSchema,
  lensCMUpdateOptionsSchema,
  lensCMMSearchResultSchema,
} from './schema';

export const serviceDefinition = {
  get: {
    out: {
      result: {
        schema: lensCMGetResultSchema,
      },
    },
  },
  create: {
    in: {
      data: {
        schema: lensItemAttributesSchema,
      },
      options: {
        schema: lensCMCreateOptionsSchema,
      },
    },
    out: {
      result: {
        schema: lensCMCreateResultSchema,
      },
    },
  },
  update: {
    in: {
      data: {
        schema: lensItemAttributesSchema,
      },
      options: {
        schema: lensCMUpdateOptionsSchema,
      },
    },
    out: {
      result: {
        schema: lensCMUpdateResultSchema,
      },
    },
  },
  search: {
    in: {
      options: {
        schema: lensCMSearchOptionsSchema,
      },
    },
    out: {
      result: {
        schema: lensCMSearchResultSchema,
      },
    },
  },
  mSearch: {
    out: {
      result: {
        schema: lensCMMSearchResultSchema,
      },
    },
  },
} satisfies ContentManagementServicesDefinition;
