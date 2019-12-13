/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FileUploadPlugin } from './server/plugin';
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
      const coreSetup = server.newPlatform.setup.core;
      const { usageCollection } = server.newPlatform.setup.plugins;
      const pluginsSetup = {
        usageCollection,
      };

      // legacy dependencies
      const __LEGACY = {
        route: server.route.bind(server),
        plugins: {
          elasticsearch: server.plugins.elasticsearch,
        },
        savedObjects: {
          getSavedObjectsRepository: server.savedObjects.getSavedObjectsRepository
        },
      };

      new FileUploadPlugin().setup(coreSetup, pluginsSetup, __LEGACY);
    }
  });
};
