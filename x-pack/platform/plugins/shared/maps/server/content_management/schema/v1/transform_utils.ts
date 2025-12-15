/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { MapItem } from '../../../../common/content_management';
import type { MapAttributes } from './map_attributes_schema';
import type { StoredMapAttributes } from '../../../saved_objects/types';
import { transformMapAttributesOut } from '../../../../common/content_management/transform_map_attributes_out';

type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
  references: SavedObjectReference[] | undefined;
};

interface PartialMapsItem {
  attributes: Partial<MapAttributes>;
  references: SavedObjectReference[] | undefined;
}

export function savedObjectToItem(
  savedObject: SavedObject<StoredMapAttributes>,
  partial: false
): MapItem;

export function savedObjectToItem(
  savedObject: PartialSavedObject<StoredMapAttributes>,
  partial: true
): PartialMapsItem;

export function savedObjectToItem(
  savedObject: SavedObject<StoredMapAttributes> | PartialSavedObject<StoredMapAttributes>,
  partial: boolean
): MapItem | PartialMapsItem {
  const { references, attributes, ...rest } = savedObject;
  return {
    ...rest,
    attributes: transformMapAttributesOut(attributes as MapAttributes, (targetName) => {
      return references ? references.find(({ name }) => name === targetName) : undefined;
    }),
    references: (references ?? []).filter(({ type }) => type === 'tag'),
  };
}
