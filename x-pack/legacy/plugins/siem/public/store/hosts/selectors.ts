/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { createSelector } from 'reselect';

import { State } from '../reducer';

import { GenericHostsModel, HostsType, HostsTableType } from './model';

const selectHosts = (state: State, hostsType: HostsType): GenericHostsModel =>
  get(hostsType, state.hosts);

export const authenticationsSelector = () =>
  createSelector(selectHosts, hosts => hosts.queries.authentications);

export const hostsSelector = () =>
  createSelector(selectHosts, hosts => hosts.queries[HostsTableType.hosts]);

export const eventsSelector = () => createSelector(selectHosts, hosts => hosts.queries.events);

export const uncommonProcessesSelector = () =>
  createSelector(selectHosts, hosts => hosts.queries.uncommonProcesses);
