/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestFacade } from '../../';
import { AnyObject, EsClient } from '../lib/esqueue';
import { EsIndexClient } from './es_index_client';
import { WithRequest } from './with_request';

export class EsClientWithRequest extends WithRequest implements EsClient {
  public readonly indices = new EsIndexClient(this);

  constructor(readonly req: RequestFacade) {
    super(req);
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
