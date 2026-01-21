/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';

import { isSpaceAwarenessEnabled } from './helpers';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';

export async function addNamespaceFilteringToQuery(query: any, namespace?: string) {
  const useSpaceAwareness = await isSpaceAwarenessEnabled();
  if (!useSpaceAwareness || !namespace) {
    return query;
  }

  // In the default space, return documents with namespaces: ['default'] OR with no namespaces property.
  // In custom spaces, return documents with namespaces: ['custom_space'].
  const filter =
    namespace === DEFAULT_NAMESPACE_STRING
      ? {
          bool: {
            should: [
              {
                terms: {
                  namespaces: [DEFAULT_SPACE_ID, ALL_SPACES_ID],
                },
              },
              {
                bool: {
                  must_not: [
                    {
                      exists: {
                        field: 'namespaces',
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      : {
          terms: {
            namespaces: [namespace, ALL_SPACES_ID],
          },
        };

  return {
    bool: {
      ...query.bool,
      filter: query.bool.filter ? [...query.bool.filter, filter] : [filter],
    },
  };
}
