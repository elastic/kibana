/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetNetworkRoutePath, NetworkRouteType } from './types';

export const getNetworkRoutePath: GetNetworkRoutePath = (
  pagePath,
  capabilitiesFetched,
  hasMlUserPermission
) => {
  if (capabilitiesFetched && !hasMlUserPermission) {
    return `${pagePath}/:tabName(${NetworkRouteType.flows}|${NetworkRouteType.dns}|${NetworkRouteType.http}|${NetworkRouteType.tls})`;
  }

  return (
    `${pagePath}/:tabName(` +
    `${NetworkRouteType.flows}|` +
    `${NetworkRouteType.dns}|` +
    `${NetworkRouteType.anomalies}|` +
    `${NetworkRouteType.http}|` +
    `${NetworkRouteType.tls})`
  );
};
