/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import compose from 'lodash/fp/compose';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

import { LoadingPage } from '../../components/loading_page';
import { replaceLogFilterInQueryString } from '../../containers/logs/log_filter';
import { replaceLogPositionInQueryString } from '../../containers/logs/with_log_position';
import { replaceSourceIdInQueryString } from '../../containers/source_id';
import { InfraNodeType } from '../../graphql/types';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';
import { useSource } from '../../containers/source/source';

type RedirectToNodeLogsType = RouteComponentProps<{
  nodeId: string;
  nodeType: InfraNodeType;
  sourceId?: string;
}>;

export const RedirectToNodeLogs = ({
  match: {
    params: { nodeId, nodeType, sourceId = 'default' },
  },
  location,
}: RedirectToNodeLogsType) => {
  const { source, isLoading } = useSource({ sourceId });
  const configuration = source && source.configuration;

  if (isLoading) {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.redirectToNodeLogs.loadingNodeLogsMessage', {
          defaultMessage: 'Loading {nodeType} logs',
          values: {
            nodeType,
          },
        })}
      />
    );
  }

  if (!configuration) {
    return null;
  }

  const nodeFilter = `${configuration.fields[nodeType]}: ${nodeId}`;
  const userFilter = getFilterFromLocation(location);
  const filter = userFilter ? `(${nodeFilter}) and (${userFilter})` : nodeFilter;

  const searchString = compose(
    replaceLogFilterInQueryString(filter),
    replaceLogPositionInQueryString(getTimeFromLocation(location)),
    replaceSourceIdInQueryString(sourceId)
  )('');

  return <Redirect to={`/logs?${searchString}`} />;
};

export const getNodeLogsUrl = ({
  nodeId,
  nodeType,
  time,
}: {
  nodeId: string;
  nodeType: InfraNodeType;
  time?: number;
}) => [`#/link-to/${nodeType}-logs/`, nodeId, ...(time ? [`?time=${time}`] : [])].join('');
