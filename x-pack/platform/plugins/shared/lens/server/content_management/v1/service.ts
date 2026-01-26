/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentManagementServicesDefinition } from '@kbn/object-versioning';

import {
  transformToV1LensSavedObject,
  transformToV1LensItemAttributes,
} from '../../../common/content_management/v1/transforms';
import {
  lensCMGetResultSchema,
  lensItemAttributesSchemaV1,
  lensCMCreateOptionsSchema,
  lensCMCreateResultSchema,
  lensCMSearchOptionsSchema,
  lensCMUpdateResultSchema,
  lensCMSearchResultSchema,
  lensCMUpdateOptionsSchema,
} from './schema';
import type { LensAttributes, LensGetOut, LensSavedObject } from './types';

export const serviceDefinition = {
  get: {
    out: {
      result: {
        schema: lensCMGetResultSchema,
        up: (result: LensGetOut) => {
          return {
            ...result,
            item: transformToV1LensSavedObject(result.item),
          } satisfies LensGetOut;
        },
      },
    },
  },
  create: {
    in: {
      data: {
        schema: lensItemAttributesSchemaV1,
        up: (attributes: LensAttributes) => {
          return transformToV1LensItemAttributes(attributes);
        },
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
        schema: lensItemAttributesSchemaV1,
        up: (attributes: LensAttributes) => {
          return transformToV1LensItemAttributes(attributes);
        },
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
        up: (item: LensSavedObject) => {
          // apply v1 transform per item, items may have different versions
          return transformToV1LensSavedObject(item);
        },
      },
    },
  },
} satisfies ContentManagementServicesDefinition;
