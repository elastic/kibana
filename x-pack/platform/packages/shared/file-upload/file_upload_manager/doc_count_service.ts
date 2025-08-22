/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { Subscription } from 'rxjs';
import { catchError, exhaustMap, finalize, map, takeWhile, throwError, timer } from 'rxjs';

const POLL_INTERVAL = 1; // seconds

export class DocCountService {
  private indexName: string | null = null;
  private subscription: Subscription | null = null;
  private initialDocCount: number | null = null;
  private expectedDocCount: number | null = null;
  private isAppendOperation: boolean = false;

  constructor(
    private data: DataPublicPluginStart,
    private onIndexSearchable: (indexName: string) => void
  ) {}

  public destroy() {
    this.subscription?.unsubscribe();
  }

  public start(indexName: string, isAppendOperation = false, expectedDocCount = 0): void {
    this.indexName = indexName;
    this.isAppendOperation = isAppendOperation;
    this.expectedDocCount = expectedDocCount;
    this.initialDocCount = null;

    this.subscription = this.pollIsSearchable()
      .pipe(finalize(() => this.onIndexSearchable(indexName)))
      .subscribe({
        error: (err) => {
          // eslint-disable-next-line no-console
          console.error('Failure when polling for index searchability:', err);
        },
      });
  }

  public updateExpectedDocCount(expectedDocCount: number): void {
    this.expectedDocCount = expectedDocCount;
  }
  private pollIsSearchable() {
    return timer(0, POLL_INTERVAL * 1000).pipe(
      exhaustMap(() => this.isSearchable$()),
      takeWhile((isSearchable) => !isSearchable, true) // takeUntil we get `true`, including the final one
    );
  }

  private isSearchable$() {
    return this.data.search
      .search({
        params: {
          index: this.indexName,
          size: this.isAppendOperation ? 0 : 1,
          body: { 
            query: { match_all: {} },
            track_total_hits: this.isAppendOperation
          },
        },
      })
      .pipe(
        map((response) => {
          if (!this.isAppendOperation) {
            // For new index creation, check if any documents exist
            return response.rawResponse.hits.hits.length > 0;
          }

          // For append operations, check if document count has increased appropriately
          const currentCount = typeof response.rawResponse.hits.total === 'number' 
            ? response.rawResponse.hits.total 
            : response.rawResponse.hits.total?.value ?? 0;

          // First time polling - capture initial count
          if (this.initialDocCount === null) {
            this.initialDocCount = currentCount;
            return false; // Keep polling
          }

          // Check if we have at least the expected increase in document count
          const expectedMinCount = this.initialDocCount + (this.expectedDocCount ?? 0);
          return currentCount >= expectedMinCount;
        }),
        catchError((err) => throwError(() => err))
      );
  }
}
