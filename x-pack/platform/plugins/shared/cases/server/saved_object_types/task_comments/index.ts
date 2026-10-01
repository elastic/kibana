/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CASE_TASK_COMMENT_SAVED_OBJECT } from '../../../common/constants';

export const caseTaskCommentSavedObjectType: SavedObjectsType = {
  name: CASE_TASK_COMMENT_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      task_id: { type: 'keyword' },
      case_id: { type: 'keyword' },
      owner: { type: 'keyword' },
      created_at: { type: 'date' },
      created_by: {
        properties: {
          username: { type: 'keyword' },
          profile_uid: { type: 'keyword' },
        },
      },
    },
  },
  modelVersions: {
    1: {
      changes: [],
    },
  },
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
};
