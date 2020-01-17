/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FlowTargetSourceDest,
  Maybe,
  NetworkDnsData,
  NetworkDnsSortField,
  NetworkHttpData,
  NetworkHttpSortField,
  NetworkTopCountriesData,
  NetworkTopNFlowData,
  NetworkTopTablesSortField,
  NetworkDsOverTimeData,
} from '../../graphql/types';
import {
  FrameworkRequest,
  RequestOptionsPaginated,
  MatrixHistogramRequestOptions,
} from '../framework';
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

export interface NetworkHttpRequestOptions extends RequestOptionsPaginated {
  networkHttpSort: NetworkHttpSortField;
  ip?: Maybe<string>;
}

export interface NetworkDnsRequestOptions extends RequestOptionsPaginated {
  isPtrIncluded: boolean;
  networkDnsSortField: NetworkDnsSortField;
  stackByField?: Maybe<string>;
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
  ): Promise<NetworkDnsData> {
    return this.adapter.getNetworkDns(req, options);
  }

  public async getNetworkDnsHistogramData(
    req: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<NetworkDsOverTimeData> {
    return this.adapter.getNetworkDnsHistogramData(req, options);
  }

  public async getNetworkHttp(
    req: FrameworkRequest,
    options: NetworkHttpRequestOptions
  ): Promise<NetworkHttpData> {
    return this.adapter.getNetworkHttp(req, options);
  }
}
