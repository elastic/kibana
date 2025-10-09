/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { AnalysisResult } from '@kbn/file-upload-common';
import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';
import type { Subscription } from 'rxjs';
import { catchError, exhaustMap, finalize, from, map, takeWhile, throwError, timer } from 'rxjs';

const POLL_INTERVAL = 1; // seconds

export class DocCountService {
  private indexName: string | null = null;
  private indexSearchableSubscription: Subscription | null = null;
  private allDocsSearchableSubscription: Subscription | null = null;
  private initialDocCount: number = 0;

  constructor(
    private fileUpload: FileUploadStartApi,
    private onIndexSearchable: (indexName: string) => void,
    private onAllDocsSearchable: (indexName: string) => void
  ) {}

  public destroy() {
    this.indexSearchableSubscription?.unsubscribe();
    this.allDocsSearchableSubscription?.unsubscribe();
  }

  public startIndexSearchableCheck(indexName: string): void {
    this.indexName = indexName;
    this.indexSearchableSubscription = timer(0, POLL_INTERVAL * 1000)
      .pipe(
        exhaustMap(() => this.isSearchable$(1)),
        takeWhile((isSearchable) => !isSearchable, true) // takeUntil we get `true`, including the final one
      )
      .pipe(finalize(() => this.onIndexSearchable(indexName)))
      .subscribe({
        error: (err) => {
          // eslint-disable-next-line no-console
          console.error('Failure when polling for index searchability:', err);
        },
      });
  }

  public startAllDocsSearchableCheck(indexName: string, totalDocCount: number): void {
    const expectedDocCount = totalDocCount + this.initialDocCount;
    this.indexName = indexName;
    this.allDocsSearchableSubscription = timer(0, POLL_INTERVAL * 1000)
      .pipe(
        exhaustMap(() => this.isSearchable$(expectedDocCount)),
        takeWhile((isSearchable) => !isSearchable, true) // takeUntil we get `true`, including the final one
      )
      .pipe(finalize(() => this.onAllDocsSearchable(indexName)))
      .subscribe({
        error: (err) => {
          // eslint-disable-next-line no-console
          console.error('Failure when polling for index searchability:', err);
        },
      });
  }

  private isSearchable$(expectedCount: number) {
    return from(this.fileUpload.isIndexSearchable(this.indexName!, expectedCount)).pipe(
      map((response) => response.isSearchable),
      catchError((err) => throwError(() => err))
    );
  }

  public async loadInitialIndexCount(indexName: string) {
    const { count } = await this.fileUpload.isIndexSearchable(indexName, 0);
    this.initialDocCount = count;
  }

  public resetInitialDocCount() {
    this.initialDocCount = 0;
  }
}

const DOC_COUNT = 10;

export async function getSampleDocs(
  data: DataPublicPluginStart,
  analysisResult: AnalysisResult,
  fileName: string
): Promise<DataTableRecord[]> {
  const docs = analysisResult.preview?.docs.filter((doc) => !doc.error);
  if (docs === undefined || docs.length === 0) {
    return [];
  }

  const tempDataView = await data.dataViews.create(
    {
      id: fileName,
      title: `temp_${fileName}`,
      allowNoIndex: true,
    },
    true,
    false
  );
  return (
    docs.slice(0, DOC_COUNT).map((doc, i) => {
      return buildDataTableRecord(
        {
          ...doc.doc,
          _id: `${fileName}-${i}`,
          _index: `temp_index_${i}`,
        } as EsHitRecord,
        tempDataView
      );
    }) ?? []
  );
}
