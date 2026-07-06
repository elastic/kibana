/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_UNKNOWN_VIS } from '@kbn/lens-common';
import { isLensDSLConfig, type LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import { getMeta, type AsCodeMeta } from '@kbn/as-code-shared-schemas';

import type { LensSavedObject, LensUpdateIn } from '../../../content_management';
import type { LensCreateRequestBody, LensResponseItem, LensUpdateRequestBody } from './types';

/**
 * Converts Lens request data to Lens Config
 */
export function getLensRequestConfig(
  builder: LensConfigBuilder,
  config: LensCreateRequestBody | LensUpdateRequestBody
): LensUpdateIn['data'] & LensUpdateIn['options'] {
  const attributes = builder.fromAPIFormat(config);

  return {
    ...attributes,
  } satisfies LensUpdateIn['data'] & LensUpdateIn['options'];
}

/**
 * Converts Lens Saved Object to Lens Response Item
 */
export function getLensResponseItem(
  builder: LensConfigBuilder,
  item: LensSavedObject
): LensResponseItem {
  const { id, references, attributes } = item;
  const meta = getLensResponseItemMeta(item);

  const data = builder.toAPIFormat({
    references,
    ...attributes,

    // TODO: fix these type issues
    state: attributes.state!,
    visualizationType: attributes.visualizationType ?? LENS_UNKNOWN_VIS,
  });

  if (isLensDSLConfig(data)) {
    return {
      id,
      data,
      meta,
    } satisfies LensResponseItem;
  }

  throw new Error('ES|QL charts are not supported in by-ref Lens');
}

/**
 * Converts Lens Saved Object to Lens Response Item meta
 *
 * TODO: remove this and replace with `getMeta` when internal routes are removed
 */
function getLensResponseItemMeta({
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  ...rest
}: LensSavedObject): AsCodeMeta {
  return getMeta({
    ...rest,
    // align camelCase from CM to snake_case
    created_at: createdAt,
    updated_at: updatedAt,
    created_by: createdBy,
    updated_by: updatedBy,
  });
}
