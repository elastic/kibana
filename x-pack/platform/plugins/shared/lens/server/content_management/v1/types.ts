/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  GetResultSO,
  SOWithMetadata,
  SOWithMetadataPartial,
} from '@kbn/content-management-utils';
import type {
  CreateIn,
  CreateResult,
  DeleteIn,
  DeleteResult,
  GetIn,
  SearchIn,
  SearchResult,
  UpdateIn,
  UpdateResult,
} from '@kbn/content-management-plugin/common';

import type {
  lensItemAttributesSchema,
  lensCMCreateOptionsSchema,
  lensCMUpdateOptionsSchema,
  lensCMSearchOptionsSchema,
  lensItemSchema,
  lensItemMetaSchema,
  lensResponseItemSchema,
  lensAPIAttributesSchema,
  lensAPIConfigSchema,
} from './schema';
import type { LENS_CONTENT_TYPE } from '../../../common/constants';

export type LensAttributes = TypeOf<typeof lensItemAttributesSchema>;
export type LensAPIAttributes = TypeOf<typeof lensAPIAttributesSchema>;

export type LensItem = TypeOf<typeof lensItemSchema>;
export type LensItemMeta = TypeOf<typeof lensItemMetaSchema>;

export type LensAPIConfig = TypeOf<typeof lensAPIConfigSchema>;
export type LensResponseItem = TypeOf<typeof lensResponseItemSchema>;

export type LensCreateOptions = TypeOf<typeof lensCMCreateOptionsSchema>;
export type LensUpdateOptions = TypeOf<typeof lensCMUpdateOptionsSchema>;
export type LensSearchOptions = TypeOf<typeof lensCMSearchOptionsSchema>;

export type LensSavedObject = SOWithMetadata<LensAttributes>;
export type LensPartialSavedObject = SOWithMetadataPartial<LensAttributes>;

export type LensGetIn = GetIn<LENS_CONTENT_TYPE>;
export type LensGetOut = GetResultSO<LensSavedObject>;

export type LensCreateIn = CreateIn<LENS_CONTENT_TYPE, LensAttributes, LensCreateOptions>;
export type LensCreateOut = CreateResult<LensSavedObject>;

// Need to handle Lens UpdateIn a bit differently
export type LensUpdateIn = UpdateIn<LENS_CONTENT_TYPE, LensAttributes, LensUpdateOptions>;
export type LensUpdateOut = UpdateResult<LensPartialSavedObject>;

export type LensDeleteIn = DeleteIn<LENS_CONTENT_TYPE>;
export type LensDeleteOut = DeleteResult;

export type LensSearchIn = SearchIn<LENS_CONTENT_TYPE, LensSearchOptions>;
export type LensSearchOut = SearchResult<LensSavedObject>;

export interface LensCrud {
  Attributes: LensAttributes;
  Item: LensSavedObject;
  PartialItem: LensPartialSavedObject;
  GetIn: LensGetIn;
  GetOut: LensGetOut;
  CreateIn: LensCreateIn;
  CreateOut: LensCreateOut;
  CreateOptions: LensCreateOptions;
  SearchIn: LensSearchIn;
  SearchOut: LensSearchOut;
  SearchOptions: LensSearchOptions;
  UpdateIn: LensUpdateIn;
  UpdateOut: LensUpdateOut;
  UpdateOptions: LensUpdateOptions;
  DeleteIn: LensDeleteIn;
  DeleteOut: LensDeleteOut;
}
