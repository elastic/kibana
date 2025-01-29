/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/public';
import type { MapAttributes } from '../../../../common/content_management';
import { getMapClient } from '../../../content_management';

export async function saveToLibrary(
  attributes: MapAttributes,
  references: SavedObjectReference[],
  savedObjectId?: string
) {
  const {
    item: { id },
  } = await (savedObjectId
    ? getMapClient().update({
        id: savedObjectId,
        data: attributes,
        options: { references },
      })
    : getMapClient().create({ data: attributes, options: { references } }));
  return { id };
}
