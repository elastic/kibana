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
}>;

export const RedirectToHostsPage = ({
  match: {
    params: { hostName },
  },
}: HostComponentProps) => <RedirectWrapper to={hostName ? `/hosts/${hostName}` : '/hosts'} />;

export const getHostsUrl = () => '#/link-to/hosts';
