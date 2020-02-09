/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { HostsSortField } from '../../graphql/types';

import { HostsTableType, HostsType } from './model';
const actionCreator = actionCreatorFactory('x-pack/siem/local/hosts');

export const updateTableActivePage = actionCreator<{
  activePage: number;
  hostsType: HostsType;
  tableType: HostsTableType;
}>('UPDATE_HOST_TABLE_ACTIVE_PAGE');

export const setHostTablesActivePageToZero = actionCreator('SET_HOST_TABLES_ACTIVE_PAGE_TO_ZERO');

export const setHostDetailsTablesActivePageToZero = actionCreator(
  'SET_HOST_DETAILS_TABLES_ACTIVE_PAGE_TO_ZERO'
);

export const updateTableLimit = actionCreator<{
  hostsType: HostsType;
  limit: number;
  tableType: HostsTableType;
}>('UPDATE_HOST_TABLE_LIMIT');

export const updateHostsSort = actionCreator<{
  sort: HostsSortField;
  hostsType: HostsType;
}>('UPDATE_HOSTS_SORT');
