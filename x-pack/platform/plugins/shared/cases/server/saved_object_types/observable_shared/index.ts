/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CASE_OBSERVABLE_SHARED_SAVED_OBJECT } from '../../../common/constants';
import { modelVersion1 } from './model_versions/model_version_1';

/**
 * One saved object per observable value in a space and owner, holding what is true of the value
 * in every case: for now, the metadata users set. Observables find it by owner, type key and
 * value, not by id, so it still resolves after a case is imported into another space.
 *
 * The comments in the mapping list the properties that are stored but not indexed.
 */
export const createCaseObservableSharedSavedObjectType = (): SavedObjectsType => ({
  name: CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      owner: {
        type: 'keyword',
        ignore_above: 1024,
      },
      type_key: {
        type: 'keyword',
        ignore_above: 1024,
      },
      value: {
        type: 'keyword',
        ignore_above: 1024,
      },
      metadata: {
        type: 'flattened',
        ignore_above: 1024,
      },
      created_at: {
        type: 'date',
      },
      created_by: {
        properties: {
          /*
          full_name: {
            type: 'keyword',
          },
          email: {
            type: 'keyword',
          },
          profile_uid: {
            type: 'keyword',
          },
           */
          username: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      updated_at: {
        type: 'date',
      },
      /*
      updated_by: {
        properties: {
          username: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
          email: {
            type: 'keyword',
          },
          profile_uid: {
            type: 'keyword',
          },
        },
      },
       */
    },
  },
  modelVersions: {
    1: modelVersion1,
  },
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
});
