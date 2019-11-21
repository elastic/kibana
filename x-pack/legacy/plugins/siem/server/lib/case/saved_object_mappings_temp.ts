/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/camelcase */
import { ElasticsearchMappingOf } from '../../utils/typed_elasticsearch_mappings';
import {
  NewCaseFormatted,
  NewCommentFormatted,
} from '../../../../../../plugins/case/server/routes/api/types';

// Temporary file to write mappings for case
// while Saved Object Mappings API is programmed for the NP
// See: https://github.com/elastic/kibana/issues/50309

export const caseSavedObjectType = 'case-workflow';
export const caseCommentSavedObjectType = 'case-workflow-comment';

export const caseSavedObjectMappings: {
  [caseSavedObjectType]: ElasticsearchMappingOf<NewCaseFormatted>;
} = {
  [caseSavedObjectType]: {
    properties: {
      assignees: {
        properties: {
          username: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
        },
      },
      comments: {
        type: 'keyword',
      },
      creation_date: {
        type: 'date',
      },
      description: {
        type: 'text',
      },
      last_edit_date: {
        type: 'date',
      },
      name: {
        type: 'keyword',
      },
      reporter: {
        properties: {
          username: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
        },
      },
      state: {
        type: 'keyword',
      },
      tags: {
        type: 'keyword',
      },
      case_type: {
        type: 'keyword',
      },
    },
  },
};

export const caseCommentSavedObjectMappings: {
  [caseCommentSavedObjectType]: ElasticsearchMappingOf<NewCommentFormatted>;
} = {
  [caseCommentSavedObjectType]: {
    properties: {
      case_workflow_id: {
        type: 'keyword',
      },
      comment: {
        type: 'text',
      },
      creation_date: {
        type: 'long',
      },
      last_edit_date: {
        type: 'long',
      },
      user: {
        properties: {
          full_name: {
            type: 'keyword',
          },
          username: {
            type: 'keyword',
          },
        },
      },
    },
  },
};
