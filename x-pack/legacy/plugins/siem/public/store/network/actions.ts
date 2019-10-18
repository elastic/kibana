/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import {
  FlowTarget,
  NetworkDnsSortField,
  NetworkTopTablesSortField,
  TlsSortField,
  UsersSortField,
} from '../../graphql/types';
import { networkModel } from '../model';

const actionCreator = actionCreatorFactory('x-pack/siem/local/network');

export const updateNetworkPageTableActivePage = actionCreator<{
  activePage: number;
  tableType: networkModel.NetworkTableType;
}>('UPDATE_NETWORK_PAGE_TABLE_ACTIVE_PAGE');

export const updateIpDetailsTableActivePage = actionCreator<{
  activePage: number;
  tableType: networkModel.IpDetailsTableType;
}>('UPDATE_NETWORK_DETAILS_TABLE_ACTIVE_PAGE');

export const setIpDetailsTablesActivePageToZero = actionCreator(
  'SET_IP_DETAILS_TABLES_ACTIVE_PAGE_TO_ZERO'
);

export const setNetworkTablesActivePageToZero = actionCreator(
  'SET_NETWORK_TABLES_ACTIVE_PAGE_TO_ZERO'
);

export const updateDnsLimit = actionCreator<{
  limit: number;
  networkType: networkModel.NetworkType;
}>('UPDATE_DNS_LIMIT');

export const updateDnsSort = actionCreator<{
  dnsSortField: NetworkDnsSortField;
  networkType: networkModel.NetworkType;
}>('UPDATE_DNS_SORT');

export const updateIsPtrIncluded = actionCreator<{
  isPtrIncluded: boolean;
  networkType: networkModel.NetworkType;
}>('UPDATE_DNS_IS_PTR_INCLUDED');

export const updateTopNFlowLimit = actionCreator<{
  limit: number;
  networkType: networkModel.NetworkType;
  tableType: networkModel.TopNTableType;
}>('UPDATE_TOP_N_FLOW_LIMIT');

export const updateTopNFlowSort = actionCreator<{
  topNFlowSort: NetworkTopTablesSortField;
  networkType: networkModel.NetworkType;
  tableType: networkModel.TopNTableType;
}>('UPDATE_TOP_N_FLOW_SORT');

export const updateTopCountriesLimit = actionCreator<{
  limit: number;
  networkType: networkModel.NetworkType;
  tableType: networkModel.TopCountriesTableType;
}>('UPDATE_TOP_COUNTRIES_LIMIT');

export const updateTopCountriesSort = actionCreator<{
  topCountriesSort: NetworkTopTablesSortField;
  networkType: networkModel.NetworkType;
  tableType: networkModel.TopCountriesTableType;
}>('UPDATE_TOP_COUNTRIES_SORT');

export const updateIpDetailsFlowTarget = actionCreator<{
  flowTarget: FlowTarget;
}>('UPDATE_IP_DETAILS_TARGET');

// TLS Table Actions
export const updateTlsSort = actionCreator<{
  tlsSortField: TlsSortField;
  networkType: networkModel.NetworkType;
}>('UPDATE_TLS_SORT');

export const updateTlsLimit = actionCreator<{
  limit: number;
  networkType: networkModel.NetworkType;
}>('UPDATE_TLS_LIMIT');

// Users Table Actions
export const updateUsersLimit = actionCreator<{
  limit: number;
}>('UPDATE_USERS_LIMIT');

export const updateUsersSort = actionCreator<{
  usersSortField: UsersSortField;
}>('UPDATE_USERS_SORT');
