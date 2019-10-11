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
  detailName: string;
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
    params: { detailName, tabName },
  },
  location: { search },
}: HostComponentProps) => {
  const defaultSelectedTab = HostsTableType.authentications;
  const selectedTab = tabName ? tabName : defaultSelectedTab;
  const to = `/hosts/${detailName}/${selectedTab}${search}`;
  return <RedirectWrapper to={to} />;
};

export const getHostsUrl = () => '#/link-to/hosts';

export const getTabsOnHostsUrl = (tabName: HostsTableType) => `#/link-to/hosts/${tabName}`;

export const getHostDetailsUrl = (detailName: string) => `#/link-to/hosts/${detailName}`;

export const getTabsOnHostDetailsUrl = (detailName: string, tabName: HostsTableType) => {
  return `#/link-to/hosts/${detailName}/${tabName}`;
};
