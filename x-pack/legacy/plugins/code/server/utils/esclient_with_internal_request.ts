/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BulkIndexDocumentsParams,
  DeleteDocumentByQueryParams,
  DeleteDocumentParams,
  GetParams,
  IndexDocumentParams,
  ReindexParams,
  SearchParams,
  UpdateDocumentParams,
  UpdateDocumentByQueryParams,
} from 'elasticsearch';
import { IClusterClient } from 'src/core/server';
import { EsClient } from '../lib/esqueue';
import { EsIndexClient } from './es_index_client';
import { WithInternalRequest } from './with_internal_request';

export class EsClientWithInternalRequest extends WithInternalRequest implements EsClient {
  public readonly indices = new EsIndexClient(this);

  constructor(cluster: IClusterClient) {
    super(cluster);
  }

  public bulk(params: BulkIndexDocumentsParams): Promise<any> {
    return this.callCluster('bulk', params);
  }

  public delete(params: DeleteDocumentParams): Promise<any> {
    return this.callCluster('delete', params);
  }

  public deleteByQuery(params: DeleteDocumentByQueryParams): Promise<any> {
    return this.callCluster('deleteByQuery', params);
  }

  public get(params: GetParams): Promise<any> {
    return this.callCluster('get', params);
  }

  public index(params: IndexDocumentParams<any>): Promise<any> {
    return this.callCluster('index', params);
  }

  public ping(): Promise<void> {
    return this.callCluster('ping');
  }

  public reindex(params: ReindexParams): Promise<any> {
    return this.callCluster('reindex', params);
  }

  public search(params: SearchParams): Promise<any> {
    return this.callCluster('search', params);
  }

  public update(params: UpdateDocumentParams): Promise<any> {
    return this.callCluster('update', params);
  }

  public updateByQuery(params: UpdateDocumentByQueryParams): Promise<any> {
    return this.callCluster('updateByQuery', params);
  }
}
