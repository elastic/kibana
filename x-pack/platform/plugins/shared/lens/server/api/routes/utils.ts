/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_UNKNOWN_VIS } from '@kbn/lens-common';
import type { LensConfigBuilder, LensApiSchemaType } from '@kbn/lens-embeddable-utils';

import type { LensSavedObject, LensUpdateIn } from '../../content_management';
import type {
  LensCreateRequestBody,
  LensItemMeta,
  LensResponseItem,
  LensUpdateRequestBody,
} from './types';
/**
 * Converts Lens request data to Lens Config
 */
export function getLensRequestConfig(
  builder: LensConfigBuilder,
  request: LensCreateRequestBody | LensUpdateRequestBody
): LensUpdateIn['data'] & LensUpdateIn['options'] {
  const chartType = builder.getType(request);
  const useApiFormat = builder.isSupported(chartType);

  if (useApiFormat) {
    const config = request as LensApiSchemaType;
    const attributes = builder.fromAPIFormat(config);

    return {
      ...attributes,
    } satisfies LensUpdateIn['data'] & LensUpdateIn['options'];
  }

  if (!('state' in request)) {
    // This should never happen, only to typeguard until fully supported
    throw new Error('Failure to transform API Format');
  }

  const { visualizationType, ...attributes } = request;

  if (!visualizationType) {
    throw new Error('Missing visualizationType');
  }

  return {
    ...attributes,
    // TODO: fix these type issues
    visualizationType,
    title: attributes.title ?? '',
    description: attributes.description ?? undefined,
  } satisfies LensUpdateIn['data'] & LensUpdateIn['options'];
}

/**
 * Used to extend the meta of the response item. Needed in Lens GET request.
 */
export type ExtendedLensResponseItem<M extends Record<string, string | boolean> = {}> = Omit<
  LensResponseItem,
  'meta'
> & {
  meta: LensResponseItem['meta'] & M;
};

/**
 * Converts Lens Saved Object to Lens Response Item
 */
export function getLensResponseItem<M extends Record<string, string | boolean>>(
  builder: LensConfigBuilder,
  item: LensSavedObject,
  extraMeta: M = {} as M
): ExtendedLensResponseItem<M> {
  const { id, references, attributes } = item;
  const meta = getLensResponseItemMeta<M>(item, extraMeta);
  const useApiFormat = builder.isSupported(attributes.visualizationType);

  if (useApiFormat) {
    const data = builder.toAPIFormat({
      references,
      ...attributes,
      // TODO: fix these type issues
      state: attributes.state!,
      visualizationType: attributes.visualizationType ?? LENS_UNKNOWN_VIS,
    });
    return {
      id,
      data,
      meta,
    } satisfies LensResponseItem;
  }

  return {
    id,
    data: {
      references,
      ...attributes,
    },
    meta,
  } satisfies LensResponseItem;
}

/**
 * Converts Lens Saved Object to Lens Response Item
 */
function getLensResponseItemMeta<M extends Record<string, string | boolean>>(
  { type, createdAt, updatedAt, createdBy, updatedBy, managed, originId }: LensSavedObject,
  extraMeta: M = {} as M
): LensItemMeta & M {
  return {
    type,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    managed,
    originId,
    ...extraMeta,
  };
}
