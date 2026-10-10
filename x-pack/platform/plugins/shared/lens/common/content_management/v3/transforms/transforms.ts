/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ITEM_VERSION_V3 } from '@kbn/lens-common/content_management/constants';
import { convertToLegacyAreaFill } from './legacy_area_fill';
import { increaseVersion } from './increase_version';
import type { LensAttributesV2, LensSavedObjectV2 } from '../../v2';
import type { LensAttributesV3, LensSavedObjectV3 } from './types';

/**
 * Transforms existing v2 Lens SO attributes to v3 Lens Item attributes
 *
 * Includes:
 * - Pin unset `areaFill` to solid on area charts
 * - Update version to v3
 *
 * v3 attributes are returned untouched, since an unset `areaFill` in v3 means gradient.
 */
export function transformToV3LensItemAttributes(
  attributes: LensAttributesV2 | LensAttributesV3
): LensAttributesV3 {
  if (attributes.version === LENS_ITEM_VERSION_V3) return attributes as LensAttributesV3;

  return increaseVersion(convertToLegacyAreaFill(attributes));
}

/**
 * Transforms existing v2 Lens SO to v3 Lens SO
 *
 * Includes:
 * - Pin unset `areaFill` to solid on area charts
 * - Update version to v3
 */
export function transformToV3LensSavedObject(
  so: LensSavedObjectV2 | LensSavedObjectV3
): LensSavedObjectV3 {
  return {
    ...so,
    attributes: transformToV3LensItemAttributes(so.attributes),
  };
}
