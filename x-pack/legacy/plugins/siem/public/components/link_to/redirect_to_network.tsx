/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { RedirectWrapper } from './redirect_wrapper';
// import { NetworkRouteType } from '../../pages/network/navigation/types';
// import { SiemPageName } from '../../pages/home/home_navigations';

export type NetworkComponentProps = RouteComponentProps<{
  detailName: string;
  search: string;
}>;

export const RedirectToNetworkPage = ({
  match: {
    params: { detailName },
  },
  location: { search },
}: NetworkComponentProps) => {
  const defaultSelectedTab = 'ips';
  const selectedTab = detailName ? detailName : defaultSelectedTab;
  const to = `/network/${selectedTab}${search}`;
  return <RedirectWrapper to={to} />;
};

export const RedirectToIpDetailsPage = ({
  match: {
    params: { detailName },
  },
  location: { search },
}: NetworkComponentProps) => {
  return (
    <RedirectWrapper to={detailName ? `/network/ip/${detailName}${search}` : `/network${search}`} />
  );
};

export const getNetworkUrl = () => '#/link-to/network';
