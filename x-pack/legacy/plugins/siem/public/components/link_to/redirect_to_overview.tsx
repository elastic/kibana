/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router';
import { RedirectWrapper } from './redirect_wrapper';

export type OverviewComponentProps = RouteComponentProps<{
  search: string;
}>;

export const RedirectToOverviewPage = ({ location: { search } }: OverviewComponentProps) => (
  <RedirectWrapper to={`/overview${search}`} />
);

export const getOverviewUrl = () => '#/link-to/overview';
