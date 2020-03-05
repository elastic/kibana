/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FileUploadPlugin } from './server/plugin';
import { mappings } from './mappings';

export const fileUpload = kibana => {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'file_upload',
    id: 'file_upload',
    // TODO: uiExports and savedObjectSchemas to be removed on migration
    uiExports: {
      mappings,
    },
    savedObjectSchemas: {
      'file-upload-telemetry': {
        isNamespaceAgnostic: true,
      },
    },

    init(server) {
      const coreSetup = server.newPlatform.setup.core;
      const coreStart = server.newPlatform.start.core;
      const { usageCollection } = server.newPlatform.setup.plugins;
      const pluginsStart = {
        usageCollection,
      };
      const fileUploadPlugin = new FileUploadPlugin();
      fileUploadPlugin.setup(coreSetup);
      fileUploadPlugin.start(coreStart, pluginsStart);
    },
  });
};
