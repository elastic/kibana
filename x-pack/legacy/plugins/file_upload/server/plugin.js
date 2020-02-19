/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initRoutes } from './routes/file_upload';
import { setElasticsearchClientServices } from './kibana_server_services';
import { registerFileUploadUsageCollector } from './telemetry';

export class FileUploadPlugin {
  setup(core, plugins, __LEGACY) {
    const getSavedObjectsRepository = __LEGACY.savedObjects.getSavedObjectsRepository;
    const router = core.http.createRouter();

    setElasticsearchClientServices(core.elasticsearch);
    initRoutes(router, getSavedObjectsRepository);

    registerFileUploadUsageCollector(plugins.usageCollection, {
      getSavedObjectsRepository,
    });
  }
}
