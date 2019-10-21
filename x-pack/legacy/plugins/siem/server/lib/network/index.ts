/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FlowTargetSourceDest,
  Maybe,
  NetworkDnsSortField,
  NetworkTopCountriesData,
  NetworkTopNFlowData,
  NetworkTopTablesSortField,
} from '../../graphql/types';
import { FrameworkRequest, RequestOptionsPaginated } from '../framework';
export * from './elasticsearch_adapter';
import { NetworkAdapter } from './types';

export * from './types';

export interface NetworkTopNFlowRequestOptions extends RequestOptionsPaginated {
  networkTopNFlowSort: NetworkTopTablesSortField;
  flowTarget: FlowTargetSourceDest;
  ip?: Maybe<string>;
}

export interface NetworkTopCountriesRequestOptions extends RequestOptionsPaginated {
  networkTopCountriesSort: NetworkTopTablesSortField;
  flowTarget: FlowTargetSourceDest;
  ip?: Maybe<string>;
}

export interface NetworkDnsRequestOptions extends RequestOptionsPaginated {
  isPtrIncluded: boolean;
  networkDnsSortField: NetworkDnsSortField;
}

export class Network {
  constructor(private readonly adapter: NetworkAdapter) {}

  public async getNetworkTopCountries(
    req: FrameworkRequest,
    options: NetworkTopCountriesRequestOptions
  ): Promise<NetworkTopCountriesData> {
    return this.adapter.getNetworkTopCountries(req, options);
  }

  public async getNetworkTopNFlow(
    req: FrameworkRequest,
    options: NetworkTopNFlowRequestOptions
  ): Promise<NetworkTopNFlowData> {
    return this.adapter.getNetworkTopNFlow(req, options);
  }

  public async getNetworkDns(
    req: FrameworkRequest,
    options: NetworkDnsRequestOptions
  ): Promise<NetworkTopNFlowData> {
    return this.adapter.getNetworkDns(req, options);
  }
}
