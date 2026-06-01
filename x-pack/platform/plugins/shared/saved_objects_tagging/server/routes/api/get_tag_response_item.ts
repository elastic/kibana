/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { getMeta } from '@kbn/as-code-shared-schemas';
import type { TagAttributes } from '../../../common/types';
import type { TagResponseItem } from './schemas';

export const getTagResponseItem = (savedObject: SavedObject<TagAttributes>): TagResponseItem => {
  const { name, color, description } = savedObject.attributes;

  return {
    id: savedObject.id,
    data: {
      name,
      color,
      ...(description ? { description } : {}),
    },
    meta: getMeta(savedObject),
  };
};
