/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensResponseItem, LensSavedObject } from '../../content_management';
import { ConfigBuilderStub } from '../../../common/transforms';

/**
 * Converts Lens Saved Object to Lens Response Item
 */
export function getLensResponseItem({
  // Data params
  id,
  references,
  attributes,

  // Meta params
  type,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  managed,
  originId,
}: LensSavedObject): LensResponseItem {
  return {
    data: ConfigBuilderStub.out({
      ...attributes,
      id,
      references,
    }),
    meta: {
      type,
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
      managed,
      originId,
    },
  };
}
