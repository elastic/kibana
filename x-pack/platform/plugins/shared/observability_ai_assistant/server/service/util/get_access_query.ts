/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';

export function getAccessQuery({
  user,
  namespace,
}: {
  user: { name: string; id?: string } | null;
  namespace: string | null;
}) {
  return [
    {
      bool: {
        filter: [
          {
            bool: {
              should: [{ term: { public: true } }, getUserAccessQuery(user)],
              minimum_should_match: 1,
            },
          },
          getNamespaceAccessQuery(namespace),
        ],
      },
    },
  ];
}

function getNamespaceAccessQuery(namespace: string | null): QueryDslQueryContainer {
  return {
    bool: {
      should: [
        {
          term: { namespace },
        },
        {
          bool: {
            must_not: {
              exists: {
                field: 'namespace',
              },
            },
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
}

export function getUserAccessQuery(
  user: { name: string; id?: string } | null
): QueryDslQueryContainer {
  if (!user) {
    return {
      bool: {
        must_not: [
          {
            exists: {
              field: 'user.name',
            },
          },
        ],
      },
    };
  }

  if (user.id) {
    return {
      bool: {
        filter: [
          {
            term: {
              'user.id': user.id,
            },
          },
          {
            term: {
              'user.name': user.name,
            },
          },
        ],
      },
    };
  }

  return {
    term: {
      'user.name': user.name,
    },
  };
}
