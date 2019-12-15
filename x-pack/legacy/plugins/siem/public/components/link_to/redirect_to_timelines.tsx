/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { RedirectWrapper } from './redirect_wrapper';
import { SiemPageName } from '../../pages/home/types';

export type TimelineComponentProps = RouteComponentProps<{
  search: string;
}>;

export const RedirectToTimelinesPage = ({ location: { search } }: TimelineComponentProps) => (
  <RedirectWrapper to={`/${SiemPageName.timelines}${search}`} />
);

export const getTimelinesUrl = () => `#/link-to/${SiemPageName.timelines}`;
