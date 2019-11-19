/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { getImportRouteHandler } from './server/routes/file_upload';
import { getTelemetry, initTelemetry } from './server/telemetry/telemetry';
import { MAX_BYTES } from './common/constants/file_import';
import { mappings } from './mappings';

export const fileUpload = kibana => {
  return new kibana.Plugin({
    require: ['elasticsearch', 'xpack_main'],
    name: 'file_upload',
    id: 'file_upload',
    uiExports: {
      mappings,
    },
    savedObjectSchemas: {
      'file-upload-telemetry': {
        isNamespaceAgnostic: true
      }
    },

    init(server) {
      const elasticsearchPlugin = server.plugins.elasticsearch;
      const getSavedObjectsRepository = server.savedObjects.getSavedObjectsRepository;
      const xpackMainPlugin = server.plugins.xpack_main;
      const makeUsageCollector = server.usage.collectorSet.makeUsageCollector;

      mirrorPluginStatus(xpackMainPlugin, this);

      // Set up route
      server.route({
        method: 'POST',
        path: '/api/fileupload/import',
        handler: getImportRouteHandler(elasticsearchPlugin, getSavedObjectsRepository),
        config: {
          payload: { maxBytes: MAX_BYTES },
        }
      });

      // Make usage collector
      const TELEMETRY_TYPE = 'fileUploadTelemetry';
      makeUsageCollector({
        type: TELEMETRY_TYPE,
        isReady: () => true,
        fetch: async () =>
          (await getTelemetry(elasticsearchPlugin, getSavedObjectsRepository)) || initTelemetry()
      });
    }
  });
};
