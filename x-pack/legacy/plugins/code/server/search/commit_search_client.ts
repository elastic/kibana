/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import {
  Commit,
  CommitSearchRequest,
  CommitSearchResult,
  CommitSearchResultItem,
} from '../../model';
import { CommitSearchIndexWithScope, CommitIndexNamePrefix } from '../indexer/schema';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { AbstractSearchClient } from './abstract_search_client';

export class CommitSearchClient extends AbstractSearchClient {
  constructor(protected readonly client: EsClient, protected readonly log: Logger) {
    super(client, log);
  }

  public async search(req: CommitSearchRequest): Promise<CommitSearchResult> {
    const resultsPerPage = this.getResultsPerPage(req);
    const from = (req.page - 1) * resultsPerPage;
    const size = resultsPerPage;

    const index = req.repoScope
      ? CommitSearchIndexWithScope(req.repoScope)
      : `${CommitIndexNamePrefix}*`;

    // Post filters for repository
    let repositoryPostFilters: object[] = [];
    if (req.repoFilters) {
      repositoryPostFilters = req.repoFilters.map((repoUri: string) => {
        return {
          term: {
            repoUri,
          },
        };
      });
    }

    const rawRes = await this.client.search({
      index,
      body: {
        from,
        size,
        query: {
          bool: {
            should: [
              {
                match: {
                  message: req.query,
                },
              },
              {
                match: {
                  body: req.query,
                },
              },
            ],
            disable_coord: false,
            adjust_pure_negative: true,
            boost: 1.0,
          },
        },
        post_filter: {
          bool: {
            should: repositoryPostFilters,
            disable_coord: false,
            adjust_pure_negative: true,
            boost: 1.0,
          },
        },
        aggregations: {
          repoUri: {
            terms: {
              field: 'repoUri',
              size: 10,
              min_doc_count: 1,
              shard_min_doc_count: 0,
              show_term_doc_count_error: false,
              order: [
                {
                  _count: 'desc',
                },
                {
                  _key: 'asc',
                },
              ],
            },
          },
        },
      },
    });

    const hits: any[] = rawRes.hits.hits;
    const aggregations = rawRes.aggregations;

    const results: CommitSearchResultItem[] = hits.map(hit => {
      const commit: Commit = hit._source;
      return commit;
    });
    const total = rawRes.hits.total.value;
    return {
      query: req.query,
      from,
      page: req.page,
      totalPage: Math.ceil(total / resultsPerPage),
      commits: results,
      repoAggregations: aggregations.repoUri.buckets,
      took: rawRes.took,
      total,
    };
  }
}
