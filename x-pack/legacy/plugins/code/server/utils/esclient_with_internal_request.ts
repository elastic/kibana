/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { AnyObject, EsClient } from '../lib/esqueue';
import { EsIndexClient } from './es_index_client';
import { WithInternalRequest } from './with_internal_request';

export class EsClientWithInternalRequest extends WithInternalRequest implements EsClient {
  public readonly indices = new EsIndexClient(this);

  constructor(server: Server) {
    super(server);
  }

  public bulk(params: AnyObject): Promise<any> {
    return this.callCluster('bulk', params);
  }

  public delete(params: AnyObject): Promise<any> {
    return this.callCluster('delete', params);
  }

  public deleteByQuery(params: AnyObject): Promise<any> {
    return this.callCluster('deleteByQuery', params);
  }

  public get(params: AnyObject): Promise<any> {
    return this.callCluster('get', params);
  }

  public index(params: AnyObject): Promise<any> {
    return this.callCluster('index', params);
  }

  public ping(): Promise<void> {
    return this.callCluster('ping');
  }

  public reindex(params: AnyObject): Promise<any> {
    return this.callCluster('reindex', params);
  }

  public search(params: AnyObject): Promise<any> {
    return this.callCluster('search', params);
  }

  public update(params: AnyObject): Promise<any> {
    return this.callCluster('update', params);
  }

  public updateByQuery(params: AnyObject): Promise<any> {
    return this.callCluster('updateByQuery', params);
  }
}
