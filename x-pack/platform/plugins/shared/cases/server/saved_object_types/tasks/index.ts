/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CASE_TASK_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';

export const caseTaskSavedObjectType: SavedObjectsType = {
  name: CASE_TASK_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: {
    dynamic: false,
    properties: {
      // Identity
      title: { type: 'text' },
      description: { type: 'text' },

      // Hierarchy
      case_id: { type: 'keyword' },
      parent_task_id: { type: 'keyword' },

      // State
      status: { type: 'keyword' },
      priority: { type: 'keyword' },

      // Assignment
      assignees: {
        properties: {
          uid: { type: 'keyword' },
        },
      },

      // Scheduling
      due_date: { type: 'date' },
      started_at: { type: 'date' },
      completed_at: { type: 'date' },

      // Ordering
      sort_order: { type: 'integer' },

      // Template origin
      template_id: { type: 'keyword' },

      // RBAC future-proofing (stored, not indexed — dynamic: false covers them)

      // Metadata
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

/**
 * The name used for the reference to the parent case in the SO references array.
 */
export const CASE_TASK_PARENT_CASE_REF_NAME = 'parentCase' as const;

/**
 * Build the references array entry linking a task to its parent case.
 */
export const buildCaseTaskCaseReference = (caseId: string) => ({
  type: CASE_SAVED_OBJECT,
  name: CASE_TASK_PARENT_CASE_REF_NAME,
  id: caseId,
});
