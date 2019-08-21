/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { RedirectWrapper } from './redirect_wrapper';
import { HostsTabName } from '../../pages/hosts/hosts_navigations';

export type HostComponentProps = RouteComponentProps<{
  hostName: string;
  tabName: HostsTabName;
  search: string;
}>;

export const RedirectToHostsPage = ({
  match: {
    params: { hostName, tabName },
  },
  location: { search },
}: HostComponentProps) => {
  if (!tabName) tabName = HostsTabName.hosts;

  let to = hostName || tabName ? `/hosts/${tabName}${search}` : `/hosts/${search}`;
  if (hostName && tabName) to = `/hosts/${tabName}${search}`;
  return <RedirectWrapper to={to} />;
};

export const RedirectToHostDetailsPage = ({
  match: {
    params: { hostName, tabName },
  },
  location: { search },
}: HostComponentProps) => {
  if (!tabName) tabName = HostsTabName.authentications;
  const to = `/hosts/${hostName}/${tabName}${search}`;
  return <RedirectWrapper to={to} />;
};

export const getHostsUrl = () => '#/link-to/hosts';

export const getTabsOnHostsUrl = (tabName: HostsTabName) => `#/link-to/hosts/${tabName}`;

export const getHostDetailsUrl = (hostName: string) => `#/link-to/hosts/${hostName}`;

export const getTabsOnHostDetailsUrl = (hostName: string, tabName: HostsTabName) => {
  return `#/link-to/hosts/${hostName}/${tabName}`;
};
