/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { increaseVersion } from './increase_version';
import { metricMigrations } from './metric';
import type { LensAttributesV2, LensSavedObjectV2 } from '../../v2';
import type { LensAttributesV3, LensSavedObjectV3 } from './types';

/**
 * Transforms existing v2 Lens SO attributes to v3 Lens Item attributes
 *
 * Includes:
 * - Update version to v3
 * - Remove `titleWeight` from metric visualization state
 */
export function transformToV3LensItemAttributes(
  attributes: LensAttributesV2 | LensAttributesV3
): LensAttributesV3 {
  return metricMigrations(increaseVersion(attributes));
}

/**
 * Transforms existing v2 Lens SO to v3 Lens SO
 *
 * Includes:
 * - Update version to v3
 * - Remove `titleWeight` from metric visualization state
 */
export function transformToV3LensSavedObject(
  so: LensSavedObjectV2 | LensSavedObjectV3
): LensSavedObjectV3 {
  return {
    ...so,
    attributes: transformToV3LensItemAttributes(so.attributes),
  };
}
