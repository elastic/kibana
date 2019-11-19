/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getImportRouteHandler } from './routes/file_upload';
import { getTelemetry, initTelemetry } from './telemetry/telemetry';
import { MAX_BYTES } from '../common/constants/file_import';

const TELEMETRY_TYPE = 'fileUploadTelemetry';

export class FileUploadPlugin {
  setup(core, plugins, __LEGACY) {
    const elasticsearchPlugin = __LEGACY.plugins.elasticsearch;
    const getSavedObjectsRepository = __LEGACY.savedObjects.getSavedObjectsRepository;
    const makeUsageCollector = __LEGACY.usage.collectorSet.makeUsageCollector;

    // Set up route
    __LEGACY.route({
      method: 'POST',
      path: '/api/fileupload/import',
      handler: getImportRouteHandler(elasticsearchPlugin, getSavedObjectsRepository),
      config: {
        payload: { maxBytes: MAX_BYTES },
      }
    });

    // Make usage collector
    makeUsageCollector({
      type: TELEMETRY_TYPE,
      isReady: () => true,
      fetch: async () =>
        (await getTelemetry(elasticsearchPlugin, getSavedObjectsRepository)) || initTelemetry()
    });
  }
}
