/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiBodyEntry } from '@kbn/saved-objects-management-plugin/server';
import type { TagAttributes } from '../../common/types';
import { getRandomColor } from '../../common';
import { validateTag } from '../services/tags/validate_tag';
import { tagRequestAttributesSchema, type TagRequestAttributes } from '../routes/api/schemas';

/** Creates the `tag` entry for Saved Objects Management's API body registry. */
export const createTagApiBodyEntry = (): ApiBodyEntry<TagRequestAttributes, TagAttributes> => ({
  getSchema: () => tagRequestAttributesSchema,
  // Same as the public GET: an empty description is left out.
  toApi: ({ attributes: { name, description, color } }) => ({
    body: { name, color, ...(description ? { description } : {}) },
    warnings: [],
  }),
  // Same as the PUT route, except that name uniqueness isn't checked, as with legacy import.
  toStored: ({ name, description, color }) => {
    const attributes = { name, description: description ?? '', color: color ?? getRandomColor() };
    const { valid, errors } = validateTag(attributes);
    if (!valid) {
      throw new Error(Object.values(errors).filter(Boolean).join(' '));
    }
    return { attributes, references: [] };
  },
});
