/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Optional } from 'utility-types';

import type { TypeOf } from '@kbn/config-schema';

import type { lensCMGetResultSchema } from '../../../content_management';
import type {
  lensCreateRequestBodySchema,
  lensCreateRequestQuerySchema,
  lensCreateResponseBodySchema,
  lensDeleteRequestParamsSchema,
  lensGetRequestParamsSchema,
  lensGetResponseBodySchema,
  lensSearchRequestQuerySchema,
  lensSearchResponseBodySchema,
  lensUpdateRequestBodySchema,
  lensUpdateRequestParamsSchema,
  lensUpdateRequestQuerySchema,
  lensUpdateResponseBodySchema,
} from './schema';
import type { lensItemMetaSchema, lensResponseItemSchema } from './schema/common';

export type LensItemMeta = TypeOf<typeof lensItemMetaSchema>;
export type LensResponseItem = TypeOf<typeof lensResponseItemSchema>;
export type CMItemResultMeta = TypeOf<typeof lensCMGetResultSchema>['meta'];

export type LensCreateRequestQuery = TypeOf<typeof lensCreateRequestQuerySchema>;
export type LensCreateRequestBody = TypeOf<typeof lensCreateRequestBodySchema>;
export type LensCreateResponseBody = TypeOf<typeof lensCreateResponseBodySchema>;

export type LensUpdateRequestParams = TypeOf<typeof lensUpdateRequestParamsSchema>;
export type LensUpdateRequestQuery = TypeOf<typeof lensUpdateRequestQuerySchema>;
export type LensUpdateRequestBody = TypeOf<typeof lensUpdateRequestBodySchema>;
export type LensUpdateResponseBody = TypeOf<typeof lensUpdateResponseBodySchema>;

export type LensGetRequestParams = TypeOf<typeof lensGetRequestParamsSchema>;
export type LensGetResponseBody = TypeOf<typeof lensGetResponseBodySchema>;

export type LensSearchRequestQuery = Optional<
  // TODO: find out why default values show as required, adding maybe returns undefined values
  TypeOf<typeof lensSearchRequestQuerySchema>,
  'page' | 'perPage'
>;
export type LensSearchResponseBody = TypeOf<typeof lensSearchResponseBodySchema>;

export type LensDeleteRequestParams = TypeOf<typeof lensDeleteRequestParamsSchema>;
