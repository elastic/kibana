/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DomainsSortField,
  FlowDirection,
  FlowTarget,
  NetworkDnsSortField,
  NetworkTopNFlowSortField,
  TlsSortField,
  UsersSortField,
} from '../../graphql/types';
import { KueryFilterQuery, networkModel, SerializedFilterQuery } from '../model';

export enum NetworkType {
  page = 'page',
  details = 'details',
}

export enum NetworkTableType {
  dns = 'dns',
  topNFlowSource = 'topNFlowSource',
  topNFlowDestination = 'topNFlowDestination',
}

export type TopNTableType =
  | networkModel.NetworkTableType.topNFlowDestination
  | networkModel.NetworkTableType.topNFlowSource;

export enum IpDetailsTableType {
  domains = 'domains',
  tls = 'tls',
  users = 'users',
}

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

// Network Page Models
export interface TopNFlowQuery extends BasicQueryPaginated {
  topNFlowSort: NetworkTopNFlowSortField;
}

export interface DnsQuery extends BasicQueryPaginated {
  dnsSortField: NetworkDnsSortField;
  isPtrIncluded: boolean;
}

export interface NetworkQueries {
  [NetworkTableType.dns]: DnsQuery;
  [NetworkTableType.topNFlowSource]: TopNFlowQuery;
  [NetworkTableType.topNFlowDestination]: TopNFlowQuery;
}

export interface NetworkPageModel {
  filterQuery: SerializedFilterQuery | null;
  filterQueryDraft: KueryFilterQuery | null;
  queries: NetworkQueries;
}

// IP Details Models
export interface DomainsQuery extends BasicQueryPaginated {
  flowDirection: FlowDirection;
  domainsSortField: DomainsSortField;
}

export interface TlsQuery extends BasicQueryPaginated {
  tlsSortField: TlsSortField;
}

export interface UsersQuery extends BasicQueryPaginated {
  usersSortField: UsersSortField;
}

export interface IpOverviewQueries {
  [IpDetailsTableType.domains]: DomainsQuery;
  [IpDetailsTableType.tls]: TlsQuery;
  [IpDetailsTableType.users]: UsersQuery;
}

export interface NetworkDetailsModel {
  filterQuery: SerializedFilterQuery | null;
  filterQueryDraft: KueryFilterQuery | null;
  flowTarget: FlowTarget;
  queries: IpOverviewQueries;
}

// Network Model
export interface NetworkModel {
  [NetworkType.page]: NetworkPageModel;
  [NetworkType.details]: NetworkDetailsModel;
}
