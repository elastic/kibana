/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

import { replaceMetricTimeInQueryString } from '../metrics/containers/with_metrics_time';
import { InfraNodeType } from '../../graphql/types';
import { getFromFromLocation, getToFromLocation } from './query_params';

type RedirectToNodeDetailProps = RouteComponentProps<{
  nodeId: string;
  nodeType: InfraNodeType;
}>;

export const RedirectToNodeDetail = ({
  match: {
    params: { nodeId, nodeType },
  },
  location,
}: RedirectToNodeDetailProps) => {
  const searchString = replaceMetricTimeInQueryString(
    getFromFromLocation(location),
    getToFromLocation(location)
  )('');

  return <Redirect to={`/infrastructure/metrics/${nodeType}/${nodeId}?${searchString}`} />;
};

export const getNodeDetailUrl = ({
  nodeType,
  nodeId,
  to,
  from,
}: {
  nodeType: InfraNodeType;
  nodeId: string;
  to?: number;
  from?: number;
}) => {
  const args = to && from ? `?to=${to}&from=${from}` : '';
  return `#/link-to/${nodeType}-detail/${nodeId}${args}`;
};
