/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CASE_LAST_VIEWED_SAVED_OBJECT } from '../../../common/constants';
import { modelVersion1 } from './model_version_1';

/**
 * One document per user and space. `entries` holds a per-entity "last viewed" marker.
 * Entries are not searched, so only `key` is mapped.
 */
export const caseLastViewedSavedObjectType: SavedObjectsType = {
  name: CASE_LAST_VIEWED_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      entries: {
        dynamic: false,
        properties: {
          key: { type: 'keyword' },
        },
      },
    },
  },
  modelVersions: {
    1: modelVersion1,
  },
};
