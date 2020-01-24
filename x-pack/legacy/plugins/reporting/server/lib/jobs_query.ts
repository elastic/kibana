/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { ServerFacade, JobSource } from '../../types';

const defaultSize = 10;

interface QueryBody {
  size?: number;
  from?: number;
  _source?: {
    excludes: string[];
  };
  query: {
    constant_score: {
      filter: {
        bool: {
          must: Array<Record<string, any>>;
        };
      };
    };
  };
}

interface GetOpts {
  includeContent?: boolean;
}

interface CountAggResult {
  count: number;
}

export function jobsQueryFactory(server: ServerFacade) {
  const index = server.config().get('xpack.reporting.index');
  // @ts-ignore `errors` does not exist on type Cluster
  const { callWithInternalUser, errors: esErrors } = server.plugins.elasticsearch.getCluster(
    'admin'
  );

  function getUsername(user: any) {
    return get(user, 'username', false);
  }

  function execQuery(queryType: string, body: QueryBody) {
    const defaultBody: Record<string, object> = {
      search: {
        _source: {
          excludes: ['output.content'],
        },
        sort: [{ created_at: { order: 'desc' } }],
        size: defaultSize,
      },
    };

    const query = {
      index: `${index}-*`,
      body: Object.assign(defaultBody[queryType] || {}, body),
    };

    return callWithInternalUser(queryType, query).catch(err => {
      if (err instanceof esErrors['401']) return;
      if (err instanceof esErrors['403']) return;
      if (err instanceof esErrors['404']) return;
      throw err;
    });
  }

  type Result = number;

  function getHits(query: Promise<Result>) {
    return query.then(res => get(res, 'hits.hits', []));
  }

  return {
    list(jobTypes: string[], user: any, page = 0, size = defaultSize, jobIds: string[] | null) {
      const username = getUsername(user);

      const body: QueryBody = {
        size,
        from: size * page,
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [{ terms: { jobtype: jobTypes } }, { term: { created_by: username } }],
              },
            },
          },
        },
      };

      if (jobIds) {
        body.query.constant_score.filter.bool.must.push({
          ids: { values: jobIds },
        });
      }

      return getHits(execQuery('search', body));
    },

    count(jobTypes: string[], user: any) {
      const username = getUsername(user);

      const body: QueryBody = {
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [{ terms: { jobtype: jobTypes } }, { term: { created_by: username } }],
              },
            },
          },
        },
      };

      return execQuery('count', body).then((doc: CountAggResult) => {
        if (!doc) return 0;
        return doc.count;
      });
    },

    get(user: any, id: string, opts: GetOpts = {}): Promise<JobSource<unknown> | void> {
      if (!id) return Promise.resolve();

      const username = getUsername(user);

      const body: QueryBody = {
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [{ term: { _id: id } }, { term: { created_by: username } }],
              },
            },
          },
        },
        size: 1,
      };

      if (opts.includeContent) {
        body._source = {
          excludes: [],
        };
      }

      return getHits(execQuery('search', body)).then(hits => {
        if (hits.length !== 1) return;
        return hits[0];
      });
    },
  };
}
