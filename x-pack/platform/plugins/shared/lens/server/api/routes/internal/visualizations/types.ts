/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Optional } from 'utility-types';

import type { z } from '@kbn/zod';

import type { lensCMGetResultSchema } from '../../../../content_management/zod';
import type {
  lensCreateRequestBodySchema,
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

export type LensItemMeta = z.output<typeof lensItemMetaSchema>;
export type LensResponseItem = z.output<typeof lensResponseItemSchema>;
export type CMItemResultMeta = z.output<typeof lensCMGetResultSchema>['meta'];

export type LensCreateRequestBody = z.output<typeof lensCreateRequestBodySchema>;
export type LensCreateResponseBody = z.output<typeof lensCreateResponseBodySchema>;

export type LensUpdateRequestParams = z.output<typeof lensUpdateRequestParamsSchema>;
export type LensUpdateRequestQuery = z.output<typeof lensUpdateRequestQuerySchema>;
export type LensUpdateRequestBody = z.output<typeof lensUpdateRequestBodySchema>;
export type LensUpdateResponseBody = z.output<typeof lensUpdateResponseBodySchema>;

export type LensGetRequestParams = z.output<typeof lensGetRequestParamsSchema>;
export type LensGetResponseBody = z.output<typeof lensGetResponseBodySchema>;

export type LensSearchRequestQuery = Optional<
  // TODO: find out why default values show as required, adding maybe returns undefined values
  z.output<typeof lensSearchRequestQuerySchema>,
  'page' | 'perPage'
>;
export type LensSearchResponseBody = z.output<typeof lensSearchResponseBodySchema>;

export type LensDeleteRequestParams = z.output<typeof lensDeleteRequestParamsSchema>;
