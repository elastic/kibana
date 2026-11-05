/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { buildPath } from '@kbn/core-http-browser';
import { API_BASE_PATH } from '../../common/constants';
import type {
  EsqlRequestBody,
  EsqlResponse,
  ExportFormat,
  FieldValuesResponse,
  Filter,
  GetDocumentResponse,
  GetFieldsResponse,
  HistogramResponse,
  ListIndicesResponse,
  MetadataResponse,
  SearchRequestBody,
  SearchResponse,
  Sort,
} from '../../common/types';

export interface DownloadedFile {
  readonly blob: Blob;
  readonly filename: string;
}

const FILENAME_PATTERN = /filename="([^"]+)"/;

const INDEX_PATH = `${API_BASE_PATH}/indices/{index}`;

/** Typed client for the Index Explorer server routes. */
export class IndexExplorerApi {
  constructor(private readonly http: HttpStart) {}

  public getMetadata(): Promise<MetadataResponse> {
    return this.http.get<MetadataResponse>(`${API_BASE_PATH}/metadata`);
  }

  public listIndices(includeHidden: boolean): Promise<ListIndicesResponse> {
    return this.http.get<ListIndicesResponse>(`${API_BASE_PATH}/indices`, {
      query: { includeHidden },
    });
  }

  public getFields(index: string): Promise<GetFieldsResponse> {
    return this.http.get<GetFieldsResponse>(buildPath(`${INDEX_PATH}/fields`, { index }));
  }

  public getFieldValues(index: string, field: string): Promise<FieldValuesResponse> {
    return this.http.get<FieldValuesResponse>(buildPath(`${INDEX_PATH}/field_values`, { index }), {
      query: { field },
    });
  }

  public getHistogram(
    index: string,
    body: { filters: Filter[]; search?: string }
  ): Promise<HistogramResponse> {
    return this.http.post<HistogramResponse>(buildPath(`${INDEX_PATH}/_histogram`, { index }), {
      body: JSON.stringify(body),
    });
  }

  public search(index: string, body: SearchRequestBody): Promise<SearchResponse> {
    return this.http.post<SearchResponse>(buildPath(`${INDEX_PATH}/_search`, { index }), {
      body: JSON.stringify(body),
    });
  }

  public getDocument(index: string, id: string): Promise<GetDocumentResponse> {
    return this.http.get<GetDocumentResponse>(buildPath(`${INDEX_PATH}/doc/{id}`, { index, id }));
  }

  public runEsql(body: EsqlRequestBody): Promise<EsqlResponse> {
    return this.http.post<EsqlResponse>(`${API_BASE_PATH}/esql`, { body: JSON.stringify(body) });
  }

  public exportIndex(
    index: string,
    body: {
      filters: Filter[];
      search?: string;
      sort?: Sort;
      columns: string[];
      hiddenColumns: string[];
      format: ExportFormat;
    }
  ): Promise<DownloadedFile> {
    return this.download(buildPath(`${INDEX_PATH}/_export`, { index }), body);
  }

  public exportEsql(body: EsqlRequestBody & { format: ExportFormat }): Promise<DownloadedFile> {
    return this.download(`${API_BASE_PATH}/esql/_export`, body);
  }

  private async download(path: string, body: object): Promise<DownloadedFile> {
    const { response } = await this.http.post(path, {
      body: JSON.stringify(body),
      asResponse: true,
      rawResponse: true,
    });
    if (!response) {
      throw new Error(`No response received from ${path}`);
    }
    const disposition = response.headers.get('content-disposition') ?? '';
    const filename = FILENAME_PATTERN.exec(disposition)?.[1] ?? 'export';
    return { blob: await response.blob(), filename };
  }
}
