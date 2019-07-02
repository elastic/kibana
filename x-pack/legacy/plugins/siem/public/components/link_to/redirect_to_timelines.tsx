/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router';
import { RedirectWrapper } from './redirect_wrapper';

export type TimelineComponentProps = RouteComponentProps<{
  search: string;
}>;

export const TIMELINES_PAGE_NAME = 'timelines';

export const RedirectToTimelinesPage = ({ location: { search } }: TimelineComponentProps) => (
  <RedirectWrapper to={`/${TIMELINES_PAGE_NAME}${search}`} />
);

export const getTimelinesUrl = () => `#/link-to/${TIMELINES_PAGE_NAME}`;
