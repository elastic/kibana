/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getImportRouteHandler } from './routes/file_upload';
import { MAX_BYTES } from '../common/constants/file_import';
import { registerFileUploadUsageCollector } from './telemetry';
import Joi from 'joi';

export class FileUploadPlugin {
  setup(core, plugins, __LEGACY) {
    const elasticsearchPlugin = __LEGACY.plugins.elasticsearch;
    const getSavedObjectsRepository = __LEGACY.savedObjects.getSavedObjectsRepository;

    // Set up route
    __LEGACY.route({
      method: 'POST',
      path: '/api/fileupload/import',
      handler: getImportRouteHandler(elasticsearchPlugin, getSavedObjectsRepository),
      config: {
        payload: { maxBytes: MAX_BYTES },
        // "index": "utah",
        // "data": [],
        // "settings": {
        //   "number_of_shards": 1
        // },
        // "mappings": {
        //   "coordinates": {
        //     "type": "geo_point"
        //   }
        // },
        // "ingestPipeline": {},
        // "fileType": "json",
        // "app": "Maps"
        validate: {
          query: Joi.object().keys({
            id: Joi.string(),
          }),
          payload: Joi.object({
            app: Joi.string(),
            index: Joi.string().required(),
            data: Joi.array().required(),
            fileType: Joi.string().required(),
            ingestPipeline: Joi.object(),
            settings: Joi.object(),
            mappings: Joi.object().required(),
          }).required(),
        }
      }
    });

    registerFileUploadUsageCollector(plugins.usageCollection, {
      elasticsearchPlugin,
      getSavedObjectsRepository,
    });
  }
}
