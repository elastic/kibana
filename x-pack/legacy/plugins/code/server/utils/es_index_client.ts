/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IndicesCreateParams,
  IndicesDeleteParams,
  IndicesExistsParams,
  IndicesExistsAliasParams,
  IndicesDeleteAliasParams,
  IndicesGetAliasParams,
  IndicesGetMappingParams,
  IndicesPutAliasParams,
  IndicesUpdateAliasesParams,
  IndicesRefreshParams,
} from 'elasticsearch';

import { WithRequest } from './with_request';
import { WithInternalRequest } from './with_internal_request';

export class EsIndexClient {
  constructor(public readonly self: WithRequest | WithInternalRequest) {}

  public exists(params: IndicesExistsParams): Promise<any> {
    return this.self.callCluster('indices.exists', params);
  }

  public create(params: IndicesCreateParams): Promise<any> {
    return this.self.callCluster('indices.create', params);
  }

  public refresh(params: IndicesRefreshParams): Promise<any> {
    return this.self.callCluster('indices.refresh', params);
  }

  public delete(params: IndicesDeleteParams): Promise<any> {
    return this.self.callCluster('indices.delete', params);
  }

  public existsAlias(params: IndicesExistsAliasParams): Promise<any> {
    return this.self.callCluster('indices.existsAlias', params);
  }

  public getAlias(params: IndicesGetAliasParams): Promise<any> {
    return this.self.callCluster('indices.getAlias', params);
  }

  public putAlias(params: IndicesPutAliasParams): Promise<any> {
    return this.self.callCluster('indices.putAlias', params);
  }

  public deleteAlias(params: IndicesDeleteAliasParams): Promise<any> {
    return this.self.callCluster('indices.deleteAlias', params);
  }

  public updateAliases(params: IndicesUpdateAliasesParams): Promise<any> {
    return this.self.callCluster('indices.updateAliases', params);
  }

  public getMapping(params: IndicesGetMappingParams): Promise<any> {
    return this.self.callCluster('indices.getMapping', params);
  }
}
