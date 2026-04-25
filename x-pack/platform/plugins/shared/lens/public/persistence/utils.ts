/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensSavedObject } from '../../server/content_management';
import type { LensItemResponse } from './lens_client';

/**
 * Converts Lens Response Item to Lens Saved Object
 *
 * This is only needed as the visualize plugin assumes we only use CM.
 */
export function getLensSOFromResponse({
  item: { id, references, ...attributes },
  meta: { type, createdAt, updatedAt, createdBy, updatedBy, managed, originId },
}: LensItemResponse): LensSavedObject {
  return {
    id,
    references,
    attributes,
    type,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    managed,
    originId,
  };
}
