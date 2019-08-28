/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { RedirectWrapper } from './redirect_wrapper';

export type HostComponentProps = RouteComponentProps<{
  hostName: string;
  search: string;
}>;

export const RedirectToHostsPage = ({
  match: {
    params: { hostName },
  },
  location: { search },
}: HostComponentProps) => {
  return <RedirectWrapper to={hostName ? `/hosts/${hostName}${search}` : `/hosts/${search}`} />;
};

export const getHostsUrl = () => '#/link-to/hosts';
