/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';

const POLL_INTERVAL = 1; // seconds

export class DocCountService {
  private indexName: string | null = null;
  private searchError: Error | null = null;

  constructor(private data: DataPublicPluginStart) {}

  public start(indexName: string, callback: (indexName: string) => void): void {
    this.indexName = indexName;
    this.pollIsSearchable().then(() => callback(indexName));
  }

  private async isSearchable() {
    if (this.indexName === null) {
      return false;
    }

    try {
      this.searchError = null;
      const result = await lastValueFrom(
        this.data.search.search({
          params: {
            index: this.indexName,
            size: 1,
            body: {
              query: {
                match_all: {},
              },
            },
          },
        })
      );
      return result.rawResponse.hits.hits.length > 0;
    } catch (error) {
      this.searchError = error as Error;
      return false;
    }
  }

  private async pollIsSearchable() {
    while (true) {
      if (this.searchError !== null) {
        throw this.searchError;
      }
      const isSearchable = await this.isSearchable();
      if (isSearchable) {
        // break out of the loop once have retrieved a doc
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL * 1000));
    }
  }
}
