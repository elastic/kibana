/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToRawColorMappingsFn } from './raw_color_mappings';
import { convertToLegendStats } from './legend_stats';
import { attributesCleanup } from './attributes';
import { metricMigrations } from './metric';
import { addVersion } from './add_version';

import type { LensAttributesV0, LensSavedObjectV0 } from '../../v0/types';
import type { LensAttributesV1, LensSavedObjectV1 } from './types';

/**
 * Transforms existing unversioned Lens SO attributes to v1 Lens Item attributes
 *
 * Includes:
 * - Legend value → Legend stats
 * - Stringified color mapping values → Raw color mappings values
 * - Fix color mapping loop mode
 * - Cleanup Lens SO attributes
 * - Cleanup metric properties
 * - Add version property
 */
export function transformToV1LensItemAttributes(
  attributes: LensAttributesV0 | LensAttributesV1
): LensAttributesV1 {
  return [
    convertToLegendStats,
    convertToRawColorMappingsFn,
    attributesCleanup,
    metricMigrations,
    addVersion,
  ].reduce((newState, fn) => fn(newState), attributes);
}

/**
 * Transforms existing unversioned Lens SO to v1 Lens SO
 *
 * Includes:
 * - Legend value → Legend stats
 * - Stringified color mapping values → Raw color mappings values
 * - Add version property
 */
export function transformToV1LensSavedObject(
  so: LensSavedObjectV0 | LensSavedObjectV1
): LensSavedObjectV1 {
  return {
    ...so,
    attributes: transformToV1LensItemAttributes(so.attributes),
  };
}
