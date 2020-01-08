/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import compose from 'lodash/fp/compose';
import React from 'react';
import { match as RouteMatch, Redirect, RouteComponentProps } from 'react-router-dom';

import { replaceLogFilterInQueryString } from '../../containers/logs/log_filter';
import { replaceLogPositionInQueryString } from '../../containers/logs/with_log_position';
import { replaceSourceIdInQueryString } from '../../containers/source_id';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';

type RedirectToLogsType = RouteComponentProps<{}>;

interface RedirectToLogsProps extends RedirectToLogsType {
  match: RouteMatch<{
    sourceId?: string;
  }>;
}

export const RedirectToLogs = ({ location, match }: RedirectToLogsProps) => {
  const sourceId = match.params.sourceId || 'default';
  const filter = getFilterFromLocation(location);
  const searchString = compose(
    replaceLogFilterInQueryString(filter),
    replaceLogPositionInQueryString(getTimeFromLocation(location)),
    replaceSourceIdInQueryString(sourceId)
  )('');

  return <Redirect to={`/logs/stream?${searchString}`} />;
};
