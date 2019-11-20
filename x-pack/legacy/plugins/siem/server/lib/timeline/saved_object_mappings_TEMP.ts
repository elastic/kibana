/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as runtimeTypes from 'io-ts';
import { ElasticsearchMappingOf } from '../../utils/typed_elasticsearch_mappings';
import { unionWithNullType } from '../../utils/typed_resolvers';

const User = runtimeTypes.type({
  id: runtimeTypes.string,
  name: runtimeTypes.string,
});

const Comment = runtimeTypes.partial({
  comment: runtimeTypes.string,
  creation_date: runtimeTypes.string,
  last_edit_date: runtimeTypes.string,
  user: User,
});

export const CaseRuntime = runtimeTypes.intersection([
  /* eslint-disable @typescript-eslint/camelcase */
  runtimeTypes.type({
    creation_date: runtimeTypes.string,
    description: runtimeTypes.string,
    last_edit_date: runtimeTypes.string,
    name: runtimeTypes.string,
    reporter: User,
    state: runtimeTypes.keyof({
      open: null,
      closed: null,
    }),
    case_type: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    assignees: unionWithNullType(runtimeTypes.array(User)),
    comments: unionWithNullType(runtimeTypes.array(Comment)),
    tags: unionWithNullType(runtimeTypes.array(runtimeTypes.string)),
  }),
]);

export interface Case extends runtimeTypes.TypeOf<typeof CaseRuntime> {}

export const caseSavedObjectType = 'case';

export const caseSavedObjectMappings: {
  [caseSavedObjectType]: ElasticsearchMappingOf<Case>;
} = {
  [caseSavedObjectType]: {
    assignees: {
      properties: {
        id: {
          type: 'keyword',
          ignore_above: 1024,
        },
        name: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    comments: {
      properties: {
        comment: {
          type: 'keyword',
          ignore_above: 1024,
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
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
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
      ignore_above: 1024,
    },
    last_edit_date: {
      type: 'date',
    },
    name: {
      type: 'keyword',
      ignore_above: 1024,
    },
    reporter: {
      properties: {
        id: {
          type: 'keyword',
          ignore_above: 1024,
        },
        name: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    state: {
      type: 'keyword',
      ignore_above: 1024,
    },
    tags: {
      type: 'keyword',
      ignore_above: 1024,
    },
    case_type: {
      type: 'keyword',
      ignore_above: 1024,
    },
  },
};
