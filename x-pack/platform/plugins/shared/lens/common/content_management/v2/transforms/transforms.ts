/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToSplitAccessors } from './split_accessors';
import { increaseVersion } from './increase_version';
import type { LensAttributesV1, LensSavedObjectV1 } from '../../v1';
import type { LensAttributesV2, LensSavedObjectV2 } from './types';

/**
 * Transforms existing v1 Lens SO attributes to v2 Lens Item attributes
 *
 * Includes:
 * - Update version to v2
 * - convert splitAccessor to splitAccessors in cartesian charts
 */
export function transformToV2LensItemAttributes(
  attributes: LensAttributesV1 | LensAttributesV2
): LensAttributesV2 {
  return convertToSplitAccessors(increaseVersion(attributes));
}

/**
 * Transforms existing v1 Lens SO to v2 Lens SO
 *
 * Includes:
 * - Update version to v2
 * - convert splitAccessor to splitAccessors in cartesian charts
 */
export function transformToV2LensSavedObject(
  so: LensSavedObjectV1 | LensSavedObjectV2
): LensSavedObjectV2 {
  return {
    ...so,
    attributes: transformToV2LensItemAttributes(so.attributes),
  };
}
