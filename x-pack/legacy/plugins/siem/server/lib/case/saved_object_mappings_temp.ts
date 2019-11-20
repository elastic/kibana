/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/camelcase */
import { ElasticsearchMappingOf } from '../../utils/typed_elasticsearch_mappings';
import { NewCaseWithDate } from '../../../../../../plugins/case/server/routes/api/types';

// Temporary file to write mappings for case
// while Saved Object Mappings API is programmed for the NP
// See: https://github.com/elastic/kibana/issues/50309

export const caseSavedObjectType = 'case-workflow';

export const caseSavedObjectMappings: {
  [caseSavedObjectType]: ElasticsearchMappingOf<NewCaseWithDate>;
} = {
  [caseSavedObjectType]: {
    properties: {
      assignees: {
        properties: {
          id: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
        },
      },
      comments: {
        properties: {
          comment: {
            type: 'keyword',
          },
          creation_date: {
            type: 'date',
          },
          last_edit_date: {
            type: 'date',
          },
          user: {
            properties: {
              id: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
            },
          },
        },
      },
      creation_date: {
        type: 'date',
      },
      description: {
        type: 'keyword',
      },
      last_edit_date: {
        type: 'date',
      },
      name: {
        type: 'keyword',
      },
      reporter: {
        properties: {
          id: {
            type: 'keyword',
          },
          name: {
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
