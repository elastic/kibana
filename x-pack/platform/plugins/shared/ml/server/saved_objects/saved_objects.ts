/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import rison from '@kbn/rison';
import { mlJob, mlTrainedModel, mlModule } from './mappings';

import { migrations } from './migrations';
import {
  ML_JOB_SAVED_OBJECT_TYPE,
  ML_MODULE_SAVED_OBJECT_TYPE,
  ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
} from '../../common/types/saved_objects';

interface MlModuleAttributes {
  id: string;
  title: string;
  description?: string;
  type: string;
  logo?: object;
  query?: string;
  jobs: object[];
  datafeeds: object[];
}

export function setupSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  savedObjects.registerType({
    name: ML_JOB_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'multiple',
    migrations,
    mappings: mlJob,
  });
  savedObjects.registerType({
    name: ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'multiple',
    migrations,
    mappings: mlTrainedModel,
  });
  savedObjects.registerType<MlModuleAttributes>({
    name: ML_MODULE_SAVED_OBJECT_TYPE,
    hidden: false,
    management: {
      importableAndExportable: true,
      visibleInManagement: false,
      getTitle(obj) {
        return obj.attributes.title;
      },
      getInAppUrl(obj) {
        return {
          path: `/app/ml/supplied_configurations/?_a=${encodeURIComponent(
            rison.encode({ supplied_configurations: { queryText: obj.attributes.title } })
          )}`,
          uiCapabilitiesPath: 'ml.canGetJobs',
        };
      },
    },
    namespaceType: 'agnostic',
    migrations,
    mappings: mlModule,
  });
}
