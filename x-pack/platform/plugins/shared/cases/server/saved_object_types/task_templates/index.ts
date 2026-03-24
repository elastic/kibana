/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CASE_TASK_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';

export const caseTaskTemplateSavedObjectType: SavedObjectsType = {
  name: CASE_TASK_TEMPLATE_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'keyword' },
      description: { type: 'text' },
      scope: { type: 'keyword' },
      tags: { type: 'keyword' },
      owner: { type: 'keyword' },
      created_at: { type: 'date' },
      created_by: {
        properties: {
          username: { type: 'keyword' },
          full_name: { type: 'keyword' },
          email: { type: 'keyword' },
          profile_uid: { type: 'keyword' },
        },
      },
      updated_at: { type: 'date' },
      updated_by: {
        properties: {
          username: { type: 'keyword' },
          full_name: { type: 'keyword' },
          email: { type: 'keyword' },
          profile_uid: { type: 'keyword' },
        },
      },
      // tasks array is stored but not indexed (dynamic: false)
    },
  },
  modelVersions: {
    1: {
      changes: [],
    },
  },
  management: {
    importableAndExportable: false,
    visibleInManagement: false,
  },
};
