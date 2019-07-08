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
import { KueryFilterQuery, SerializedFilterQuery } from '../model';

export enum NetworkType {
  page = 'page',
  details = 'details',
}

export interface BasicQuery {
  limit: number;
}

// Network Page Models
export interface TopNFlowQuery extends BasicQuery {
  flowTarget: FlowTarget;
  topNFlowSort: NetworkTopNFlowSortField;
  flowDirection: FlowDirection;
}

export interface DnsQuery extends BasicQuery {
  dnsSortField: NetworkDnsSortField;
  isPtrIncluded: boolean;
}

interface NetworkQueries {
  topNFlow: TopNFlowQuery;
  dns: DnsQuery;
}

export interface NetworkPageModel {
  filterQuery: SerializedFilterQuery | null;
  filterQueryDraft: KueryFilterQuery | null;
  queries: NetworkQueries;
}

// IP Details Models
export interface DomainsQuery extends BasicQuery {
  flowDirection: FlowDirection;
  domainsSortField: DomainsSortField;
}

export interface TlsQuery extends BasicQuery {
  tlsSortField: TlsSortField;
}

export interface UsersQuery extends BasicQuery {
  usersSortField: UsersSortField;
}

interface IpOverviewQueries {
  domains: DomainsQuery;
  tls: TlsQuery;
  users: UsersQuery;
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
