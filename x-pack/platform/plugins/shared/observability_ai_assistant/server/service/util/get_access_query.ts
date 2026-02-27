/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function getAccessQuery({
  user,
  namespace,
}: {
  user?: { name: string; id?: string };
  namespace?: string;
}) {
  return [
    {
      bool: {
        filter: [
          {
            bool: {
              should: [{ term: { public: true } }, ...getUserAccessFilters(user)],
              minimum_should_match: 1,
            },
          },
          {
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
            },
          },
        ],
      },
    },
  ];
}

export function getUserAccessFilters(user?: { name: string; id?: string }) {
  if (!user) {
    return [];
  }

  if (user.id) {
    return [
      { term: { 'user.id': user.id } },
      {
        bool: {
          must_not: { exists: { field: 'user.id' } },
          must: { term: { 'user.name': user.name } },
        },
      },
    ];
  }

  return [{ term: { 'user.name': user.name } }];
}
