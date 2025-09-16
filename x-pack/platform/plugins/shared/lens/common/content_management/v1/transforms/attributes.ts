/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributes } from '../../../../server/content_management';

/**
 * Cleanup null and loose SO attribute types
 * - `description` should not allow `null`
 * - `visualizationType` should not allow `null` or `undefined`
 */
export function attributesCleanup(attributes: LensAttributes): LensAttributes {
  return {
    ...attributes,
    description: attributes.description ?? undefined,
    visualizationType: attributes.visualizationType ?? 'lnsXY', // default to XY
  };
}
