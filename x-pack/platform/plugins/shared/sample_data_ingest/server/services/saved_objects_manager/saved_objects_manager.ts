/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  ISavedObjectsImporter,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { Readable } from 'stream';
import type { DatasetSampleType } from '../../../common';
import { getSavedObjects, getDashboardId } from '../../saved_objects/saved_objects';

interface SavedObjectsManagerOpts {
  logger: Logger;
}

export class SavedObjectsManager {
  private readonly log: Logger;

  constructor({ logger }: SavedObjectsManagerOpts) {
    this.log = logger;
  }

  async importSavedObjects(
    soImporter: ISavedObjectsImporter,
    sampleType: DatasetSampleType
  ): Promise<{ savedObjects: SavedObject[]; dashboardId?: string }> {
    const savedObjects = getSavedObjects(sampleType);
    const readStream = Readable.from(savedObjects);

    const { errors = [] } = await soImporter.import({
      readStream,
      overwrite: true,
      createNewCopies: false,
    });

    if (errors.length > 0) {
      const errMsg = `Errors while loading saved objects. Errors: ${JSON.stringify(
        errors.map(({ type, id, error }) => ({ type, id, error }))
      )}`;
      this.log.warn(errMsg);
      throw new Error(errMsg);
    }

    const dashboardId = getDashboardId(sampleType);
    return { savedObjects, dashboardId };
  }

  async deleteSavedObjects(
    soClient: SavedObjectsClientContract,
    sampleType: DatasetSampleType
  ): Promise<number> {
    const savedObjects = getSavedObjects(sampleType);
    let deletedCount = 0;

    const deletePromises = savedObjects.map(async ({ type, id }) => {
      try {
        await soClient.delete(type, id);
        deletedCount++;
      } catch (err) {
        // if the object doesn't exist, ignore the error and proceed
        if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
          this.log.debug(`Saved object ${type}:${id} not found, skipping deletion`);
          return;
        }
        this.log.error(`Failed to delete saved object ${type}:${id}: ${err.message}`);
        throw err;
      }
    });

    try {
      await Promise.all(deletePromises);
    } catch (err) {
      throw new Error(`Unable to delete sample dataset saved objects, error: ${err.message}`);
    }

    return deletedCount;
  }

  async getDashboardId(
    soClient: SavedObjectsClientContract,
    sampleType: DatasetSampleType
  ): Promise<string | undefined> {
    const id = getDashboardId(sampleType);
    if (!id) {
      return undefined;
    }

    try {
      await soClient.get('dashboard', id);
      return id;
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        this.log.debug(`Dashboard ${id} not found in saved objects`);
        return undefined;
      }

      this.log.error(`Failed to get dashboard id for sample type ${sampleType}: ${err.message}`);
      throw err;
    }
  }
}
