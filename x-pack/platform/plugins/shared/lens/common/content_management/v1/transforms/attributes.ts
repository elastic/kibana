/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_UNKNOWN_VIS } from '@kbn/lens-common';

import type { LensAttributes } from '../../../../server/content_management/v1';
import type { LensSOAttributesV0 } from '../../../../server/content_management/v0';

/**
 * Cleanup null and loose SO attribute types
 * - `description` should not allow `null`
 * - `visualizationType` should not allow `null` or `undefined`
 */
export function attributesCleanup(attributes: LensSOAttributesV0): LensAttributes {
  return {
    ...attributes,
    // fix type mismatches, null -> undefined
    description: attributes.description ?? undefined,
    // fix type mismatches, null | undefined -> string
    visualizationType: attributes.visualizationType ?? LENS_UNKNOWN_VIS, // should never happen
  };
}
