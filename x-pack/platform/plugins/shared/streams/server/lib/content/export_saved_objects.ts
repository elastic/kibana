/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import {
  ISavedObjectsExporter,
  KibanaRequest,
  SavedObject,
  SavedObjectTypeIdTuple,
  SavedObjectsExportResultDetails,
} from '@kbn/core/server';
import { ContentPackSavedObject } from '@kbn/streams-schema';
import { createFilterStream, createMapStream } from '@kbn/utils';

export async function exportSavedObjects({
  objects,
  exporter,
  request,
}: {
  objects: SavedObjectTypeIdTuple[];
  exporter: ISavedObjectsExporter;
  request: KibanaRequest;
}): Promise<Readable> {
  const exportStream = await exporter.exportByObjects({
    request,
    objects,
    includeReferencesDeep: true,
  });

  return exportStream
    .pipe(
      createFilterStream<SavedObject | SavedObjectsExportResultDetails>(
        (savedObject) =>
          !!savedObject &&
          (savedObject as SavedObjectsExportResultDetails).exportedCount === undefined
      )
    )
    .pipe(
      createMapStream<SavedObject>(
        (savedObject) =>
          ({
            type: 'saved_object',
            content: savedObject,
          } as ContentPackSavedObject)
      )
    );
}
