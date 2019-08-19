/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { RedirectWrapper } from './redirect_wrapper';
import { HostsTabName } from '../../pages/hosts/hosts';

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
  return (
    <RedirectWrapper
      to={hostName || tabName ? `/hosts/${hostName || tabName}${search}` : `/hosts/${search}`}
      tabName={tabName}
    />
  );
};

export const getHostsUrl = () => '#/link-to/hosts';

export const getTabsOnHostsUrl = (tabName: HostsTabName) => `#/link-to/hosts/${tabName}`;
