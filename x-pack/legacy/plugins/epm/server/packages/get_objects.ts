/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsBulkCreateObject } from 'src/core/server/';
import { AssetType } from '../../common/types';
import * as Registry from '../registry';

type ArchiveAsset = Pick<SavedObject, 'attributes' | 'migrationVersion' | 'references'>;
type SavedObjectToBe = Required<SavedObjectsBulkCreateObject> & { type: AssetType };

export async function getObjects(
  pkgkey: string,
  filter = (entry: Registry.ArchiveEntry): boolean => true
): Promise<SavedObjectToBe[]> {
  // Create a Map b/c some values, especially index-patterns, are referenced multiple times
  const objects: Map<string, SavedObjectToBe> = new Map();

  // Get paths which match the given filter
  const paths = await Registry.getArchiveInfo(pkgkey, filter);

  // Get all objects which matched filter. Add them to the Map
  const rootObjects = await Promise.all(paths.map(getObject));
  rootObjects.forEach(obj => objects.set(obj.id, obj));

  // Each of those objects might have `references` property like [{id, type, name}]
  for (const object of rootObjects) {
    // For each of those objects, if they have references
    for (const reference of object.references) {
      // Get the referenced objects. Call same function with a new filter
      const referencedObjects = await getObjects(pkgkey, (entry: Registry.ArchiveEntry) => {
        // Skip anything we've already stored
        if (objects.has(reference.id)) return false;

        // Is the archive entry the reference we want?
        const { type, file } = Registry.pathParts(entry.path);
        const isType = type === reference.type;
        const isJson = file === `${reference.id}.json`;

        return isType && isJson;
      });

      // Add referenced objects to the Map
      referencedObjects.forEach(ro => objects.set(ro.id, ro));
    }
  }

  // return the array of unique objects
  return Array.from(objects.values());
}

export async function getObject(key: string) {
  const buffer = Registry.getAsset(key);

  // cache values are buffers. convert to string / JSON
  const json = buffer.toString('utf8');
  // convert that to an object
  const asset: ArchiveAsset = JSON.parse(json);

  const { type, file } = Registry.pathParts(key);
  const savedObject: SavedObjectToBe = {
    type,
    id: file.replace('.json', ''),
    attributes: asset.attributes,
    references: asset.references || [],
    migrationVersion: asset.migrationVersion || {},
  };

  return savedObject;
}
