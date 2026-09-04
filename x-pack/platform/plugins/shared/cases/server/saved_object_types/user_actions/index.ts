/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';
import { createUserActionsMigrations } from '../migrations/user_actions';
import { modelVersion1, modelVersion2 } from './model_versions';

/**
 * The comments in the mapping indicate the additional properties that are stored in Elasticsearch but are not indexed.
 * Remove these comments when https://github.com/elastic/kibana/issues/152756 is resolved.
 */

export const createCaseUserActionSavedObjectType = (): SavedObjectsType => ({
  name: CASE_USER_ACTION_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: {
    dynamic: false,
    properties: {
      action: {
        type: 'keyword',
      },
      created_at: {
        type: 'date',
      },
      created_by: {
        properties: {
          /*
          email: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
          profile_uid: {
            type: 'keyword',
          },
          */
          username: {
            type: 'keyword',
          },
        },
      },
      payload: {
        dynamic: false,
        properties: {
          connector: {
            properties: {
              // connector.type
              type: { type: 'keyword' },
            },
          },
          comment: {
            properties: {
              // comment.type
              type: { type: 'keyword' },
              // comment.externalReferenceAttachmentTypeId
              externalReferenceAttachmentTypeId: { type: 'keyword' },
              // comment.persistableStateAttachmentTypeId
              persistableStateAttachmentTypeId: { type: 'keyword' },
            },
          },
          assignees: {
            properties: {
              // assignees.uid
              uid: { type: 'keyword' },
            },
          },
          // Added in model version 2: allows aggregating workflow run origins in telemetry.
          origin: {
            properties: {
              // origin.type — one of the CaseWorkflowRunOrigin discriminant values
              type: { type: 'keyword' },
            },
          },
        },
      },
      owner: {
        type: 'keyword',
      },
      source: {
        properties: {
          // source.type
          type: { type: 'keyword', ignore_above: 1024 },
          /*
          id: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          run_id: {
            type: 'keyword',
          },
          */
        },
      },
      // The type of the action
      type: {
        type: 'keyword',
      },
    },
  },
  migrations: () => createUserActionsMigrations(),
  modelVersions: {
    1: modelVersion1,
    2: modelVersion2,
  },
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
});
