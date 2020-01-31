/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { oncePerServer } from './once_per_server';

const defaultSize = 10;

function jobsQueryFn(server) {
  const index = server.config().get('xpack.reporting.index');
  const { callWithInternalUser, errors: esErrors } = server.plugins.elasticsearch.getCluster(
    'admin'
  );

  function getUsername(user) {
    return get(user, 'username', false);
  }

  function execQuery(queryType, body) {
    const defaultBody = {
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

  function getHits(query) {
    return query.then(res => get(res, 'hits.hits', []));
  }

  return {
    list(jobTypes, user, page = 0, size = defaultSize, jobIds) {
      const username = getUsername(user);

      const body = {
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

    count(jobTypes, user) {
      const username = getUsername(user);

      const body = {
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

      return execQuery('count', body).then(doc => {
        if (!doc) return 0;
        return doc.count;
      });
    },

    get(user, id, opts = {}) {
      if (!id) return Promise.resolve();

      const username = getUsername(user);

      const body = {
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

export const jobsQueryFactory = oncePerServer(jobsQueryFn);
