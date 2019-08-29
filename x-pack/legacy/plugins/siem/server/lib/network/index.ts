/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FlowTargetNew,
  NetworkDnsSortField,
  NetworkTopNFlowData,
  NetworkTopNFlowSortField,
} from '../../graphql/types';
import { FrameworkRequest, RequestOptionsPaginated } from '../framework';
export * from './elasticsearch_adapter';
import { NetworkAdapter } from './types';

export * from './types';

export interface NetworkTopNFlowRequestOptions extends RequestOptionsPaginated {
  networkTopNFlowSort: NetworkTopNFlowSortField;
  flowTarget: FlowTargetNew;
}

export interface NetworkDnsRequestOptions extends RequestOptionsPaginated {
  isPtrIncluded: boolean;
  networkDnsSortField: NetworkDnsSortField;
}

export class Network {
  constructor(private readonly adapter: NetworkAdapter) {}

  public async getNetworkTopNFlow(
    req: FrameworkRequest,
    options: NetworkTopNFlowRequestOptions
  ): Promise<NetworkTopNFlowData> {
    return await this.adapter.getNetworkTopNFlow(req, options);
  }

  public async getNetworkDns(
    req: FrameworkRequest,
    options: NetworkDnsRequestOptions
  ): Promise<NetworkTopNFlowData> {
    return await this.adapter.getNetworkDns(req, options);
  }
}
