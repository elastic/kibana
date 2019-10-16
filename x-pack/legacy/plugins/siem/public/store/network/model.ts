/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FlowTarget,
  NetworkDnsSortField,
  NetworkTopNFlowSortField,
  TlsSortField,
  UsersSortField,
} from '../../graphql/types';

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
  | NetworkTableType.topNFlowDestination
  | NetworkTableType.topNFlowSource
  | IpDetailsTableType.topNFlowDestination
  | IpDetailsTableType.topNFlowSource;

export enum IpDetailsTableType {
  topNFlowSource = 'topNFlowSourceIp',
  topNFlowDestination = 'topNFlowDestinationIp',
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
  queries: NetworkQueries;
}

// IP Details Models

export interface TlsQuery extends BasicQueryPaginated {
  tlsSortField: TlsSortField;
}

export interface UsersQuery extends BasicQueryPaginated {
  usersSortField: UsersSortField;
}

export interface IpOverviewQueries {
  [IpDetailsTableType.topNFlowSource]: TopNFlowQuery;
  [IpDetailsTableType.topNFlowDestination]: TopNFlowQuery;
  [IpDetailsTableType.tls]: TlsQuery;
  [IpDetailsTableType.users]: UsersQuery;
}

export interface NetworkDetailsModel {
  flowTarget: FlowTarget;
  queries: IpOverviewQueries;
}

// Network Model
export interface NetworkModel {
  [NetworkType.page]: NetworkPageModel;
  [NetworkType.details]: NetworkDetailsModel;
}
