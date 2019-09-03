/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchRequest, SearchResult } from '../../model';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { SearchClient } from './search_client';

export abstract class AbstractSearchClient implements SearchClient {
  protected RESULTS_PER_PAGE = 20;

  constructor(protected readonly client: EsClient, protected readonly log: Logger) {}

  // For the full search request.
  public async search(req: SearchRequest): Promise<SearchResult> {
    // This is the abstract implementation, you should override this function.
    return new Promise<SearchResult>((resolve, reject) => {
      resolve();
    });
  }

  // For the typeahead suggestions request.
  public async suggest(req: SearchRequest): Promise<SearchResult> {
    // This is the abstract implementation, you should override this function.
    // By default, return the same result as search function above.
    return this.search(req);
  }

  public getResultsPerPage(req: SearchRequest): number {
    let resultsPerPage = this.RESULTS_PER_PAGE;
    if (req.resultsPerPage !== undefined) {
      resultsPerPage = req.resultsPerPage;
    }
    return resultsPerPage;
  }
}
