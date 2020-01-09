/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { RedirectWrapper } from './redirect_wrapper';
import { SiemPageName } from '../../pages/home/types';

export type CaseComponentProps = RouteComponentProps<{
  search: string;
}>;

export const RedirectToCasePage = ({ location: { search } }: CaseComponentProps) => (
  <RedirectWrapper to={`/${SiemPageName.case}${search}`} />
);

export const getCaseUrl = () => `#/link-to/${SiemPageName.case}`;
