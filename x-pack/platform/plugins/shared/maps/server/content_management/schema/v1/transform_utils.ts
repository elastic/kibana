/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import { extractReferences, injectReferences } from '../../../../common/migrations/references';
import type { MapItem } from '../../../../common/content_management';
import type { MapAttributes } from './types';
import type { StoredMapAttributes } from '../../../saved_objects/types';

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
    attributes: transformMapOut(attributes as MapAttributes, references ?? []),
    references: (references ?? []).filter(({ type }) => type === 'tag'),
  };
}

function transformMapOut(storedMapState: StoredMapAttributes, references: SavedObjectReference[]) {
  const { attributes } = injectReferences({
    attributes: storedMapState,
    references: references ?? [],
  });
  // TODO convert stringified JSON to objects
  return attributes;
}

export function transformMapIn(mapState: MapAttributes) {
  const { attributes, references } = extractReferences({ attributes: mapState });
  // TODO convert API state to stringified JSON
  return {
    attributes,
    references,
  };
}
