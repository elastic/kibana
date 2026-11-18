/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_UNKNOWN_VIS } from '@kbn/lens-common';
import { isLensDSLConfig, type LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import { getMeta, type AsCodeMeta } from '@kbn/as-code-shared-schemas';
import { toAsCodeTags, toStoredTags } from '@kbn/as-code-shared-transforms';

import type { LensSavedObject, LensUpdateIn } from '../../../content_management/zod';
import type { LensCreateRequestBody, LensResponseItem, LensUpdateRequestBody } from './types';
import type { LensApiConfigLibItemNoESQL } from './schema/common';

/**
 * Converts Lens request data to Lens Config
 */
export function getLensRequestConfig(
  builder: LensConfigBuilder,
  config: LensCreateRequestBody | LensUpdateRequestBody
): LensUpdateIn['data'] & LensUpdateIn['options'] {
  const { references: tagReferences } = toStoredTags(config);
  const attributes = builder.fromAPIFormat(config);

  return {
    ...attributes,
    references: [...(attributes.references ?? []), ...tagReferences],
  } satisfies LensUpdateIn['data'] & LensUpdateIn['options'];
}

/**
 * Converts Lens Saved Object to Lens Response Item.
 */
export function getLensResponseItem(
  builder: LensConfigBuilder,
  item: LensSavedObject
): LensResponseItem {
  return {
    id: item.id,
    data: getLensApiData(builder, item),
    meta: getLensResponseItemMeta(item),
  } satisfies LensResponseItem;
}

/**
 * Converts stored Lens attributes and references to the by-reference API body; throws for ES|QL charts.
 */
export function getLensApiData(
  builder: LensConfigBuilder,
  { attributes, references }: Pick<LensSavedObject, 'attributes' | 'references'>
): LensApiConfigLibItemNoESQL {
  const { tags } = toAsCodeTags(references);
  const chartData = builder.toAPIFormat({
    references,
    ...attributes,

    // TODO: fix these type issues
    state: attributes.state!,
    visualizationType: attributes.visualizationType ?? LENS_UNKNOWN_VIS,
  });
  const data = { ...chartData, tags };

  if (isLensDSLConfig(data)) {
    return data;
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
