/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Repository, RepositorySearchRequest, RepositorySearchResult } from '../../model';
import {
  RepositoryIndexNamePrefix,
  RepositoryReservedField,
  RepositorySearchIndexWithScope,
} from '../indexer/schema';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { AbstractSearchClient } from './abstract_search_client';

export class RepositorySearchClient extends AbstractSearchClient {
  constructor(protected readonly client: EsClient, protected readonly log: Logger) {
    super(client, log);
  }

  public async search(req: RepositorySearchRequest): Promise<RepositorySearchResult> {
    const resultsPerPage = this.getResultsPerPage(req);
    const from = (req.page - 1) * resultsPerPage;
    const size = resultsPerPage;

    const index = req.repoScope
      ? RepositorySearchIndexWithScope(req.repoScope)
      : `${RepositoryIndexNamePrefix}*`;

    const queryStr = req.query.toLowerCase();

    const rawRes = await this.client.search({
      index,
      body: {
        from,
        size,
        query: {
          bool: {
            should: [
              {
                simple_query_string: {
                  query: queryStr,
                  fields: [
                    `${RepositoryReservedField}.name^1.0`,
                    `${RepositoryReservedField}.org^1.0`,
                  ],
                  default_operator: 'or',
                  lenient: false,
                  analyze_wildcard: false,
                  boost: 1.0,
                },
              },
              // This prefix query is mostly for typeahead search.
              {
                prefix: {
                  [`${RepositoryReservedField}.name`]: {
                    value: queryStr,
                    boost: 100.0,
                  },
                },
              },
            ],
            disable_coord: false,
            adjust_pure_negative: true,
            boost: 1.0,
          },
        },
      },
    });

    const hits: any[] = rawRes.hits.hits;
    const repos: Repository[] = hits
      .filter(hit => hit._source[RepositoryReservedField])
      .map(hit => {
        const repo: Repository = hit._source[RepositoryReservedField];
        return repo;
      });
    const total = rawRes.hits.total.value;
    return {
      repositories: repos,
      took: rawRes.took,
      total,
      from,
      page: req.page,
      totalPage: Math.ceil(total / resultsPerPage),
    };
  }
}
