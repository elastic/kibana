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

  constructor(
    private data: DataPublicPluginStart,
    private onIndexSearchable: (indexName: string) => void
  ) {}

  public destroy() {
    this.subscription?.unsubscribe();
  }

  public start(indexName: string): void {
    this.indexName = indexName;
    this.subscription = this.pollIsSearchable()
      .pipe(finalize(() => this.onIndexSearchable(indexName)))
      .subscribe({
        error: (err) => {
          // eslint-disable-next-line no-console
          console.error('Failure when polling for index searchability:', err);
        },
      });
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
          size: 1,
          body: { query: { match_all: {} } },
        },
      })
      .pipe(
        map((response) => response.rawResponse.hits.hits.length > 0),
        catchError((err) => throwError(() => err))
      );
  }
}
