/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { RedirectWrapper } from './redirect_wrapper';
import { HostsTableType } from '../../store/hosts/model';

export type HostComponentProps = RouteComponentProps<{
  hostName: string;
  tabName: HostsTableType;
  search: string;
}>;

export const RedirectToHostsPage = ({
  match: {
    params: { tabName },
  },
  location: { search },
}: HostComponentProps) => {
  const defaultSelectedTab = HostsTableType.hosts;
  const selectedTab = tabName ? tabName : defaultSelectedTab;
  const to = `/hosts/${selectedTab}${search}`;

  return <RedirectWrapper to={to} />;
};

export const RedirectToHostDetailsPage = ({
  match: {
    params: { hostName, tabName },
  },
  location: { search },
}: HostComponentProps) => {
  const defaultSelectedTab = HostsTableType.authentications;
  const selectedTab = tabName ? tabName : defaultSelectedTab;
  const to = `/hosts/${hostName}/${selectedTab}${search}`;
  return <RedirectWrapper to={to} />;
};

export const getHostsUrl = () => '#/link-to/hosts';

export const getTabsOnHostsUrl = (tabName: HostsTableType) => `#/link-to/hosts/${tabName}`;

export const getHostDetailsUrl = (hostName: string) => `#/link-to/hosts/${hostName}`;

export const getTabsOnHostDetailsUrl = (hostName: string, tabName: HostsTableType) => {
  return `#/link-to/hosts/${hostName}/${tabName}`;
};
