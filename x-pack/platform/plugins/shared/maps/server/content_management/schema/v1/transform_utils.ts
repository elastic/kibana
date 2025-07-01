/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { MapItem, MapAttributes } from '../../../../common/content_management';
import type { MapsCreateOptions, MapsSavedObjectAttributes } from './types';

type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
  references: SavedObjectReference[] | undefined;
};

interface PartialMapsItem {
  attributes: Partial<MapItem['attributes']>;
  references: SavedObjectReference[] | undefined;
}

export function savedObjectToItem(
  savedObject: SavedObject<MapsSavedObjectAttributes>,
  partial: false
): MapItem;

export function savedObjectToItem(
  savedObject: PartialSavedObject<MapsSavedObjectAttributes>,
  partial: true
): PartialMapsItem;

// export function savedObjectToItem(
//   savedObject:
//     | SavedObject<MapsSavedObjectAttributes>
//     | PartialSavedObject<MapsSavedObjectAttributes>,
//   partial: boolean
// ): MapItem | PartialMapsItem {
//   return savedObject;
// }

export function savedObjectToItem(
  savedObject:
    | SavedObject<MapsSavedObjectAttributes>
    | PartialSavedObject<MapsSavedObjectAttributes>,
  partial: boolean
): MapItem | PartialMapsItem {
  const normalizedAttributes = {
    ...savedObject.attributes,
    description: savedObject.attributes?.description ?? undefined,
    mapStateJSON: savedObject.attributes?.mapStateJSON ?? undefined,
    layerListJSON: savedObject.attributes?.layerListJSON ?? undefined,
    uiStateJSON: savedObject.attributes?.uiStateJSON ?? undefined,
  };

  return {
    ...savedObject,
    attributes: normalizedAttributes,
  };
}

export function itemToSavedObject(item: {
  attributes: MapAttributes;
  references?: MapsCreateOptions['references'];
}) {
  return item as SavedObject<MapsSavedObjectAttributes>;
}
