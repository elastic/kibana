/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorSummary } from '../../../../common/graphql/types';
import { addBasePath } from './add_base_path';
import { buildHref } from './build_href';

export const getMetricsContainerHref = (
  summary: MonitorSummary,
  basePath: string
): string | undefined => {
  const getHref = (value: string | string[] | undefined) => {
    if (!value) {
      return undefined;
    }
    const ret = !Array.isArray(value) ? value : value[0];
    return addBasePath(basePath, `/app/infra#/link-to/container-detail/${encodeURIComponent(ret)}`);
  };
  return buildHref(summary.state.checks || [], 'container.id', getHref);
};

export const getMetricsKubernetesHref = (
  summary: MonitorSummary,
  basePath: string
): string | undefined => {
  const getHref = (value: string | string[] | undefined) => {
    if (!value) {
      return undefined;
    }
    const ret = !Array.isArray(value) ? value : value[0];
    return addBasePath(basePath, `/app/infra#/link-to/pod-detail/${encodeURIComponent(ret)}`);
  };

  return buildHref(summary.state.checks || [], 'kubernetes.pod.uid', getHref);
};

export const getMetricsIpHref = (summary: MonitorSummary, basePath: string) => {
  const getHref = (value: string | string[] | undefined) => {
    if (!value) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      const expression = encodeURIComponent(`host.ip : ${value}`);
      return addBasePath(
        basePath,
        `/app/infra#/metrics/inventory?waffleFilter=(expression:'${expression}',kind:kuery)`
      );
    }
    const ips = value.reduce(
      (str: string, cur: string) => (!str ? `host.ip : ${cur}` : str + ` or host.ip : ${cur}`),
      ''
    );
    return ips === ''
      ? undefined
      : addBasePath(
          basePath,
          `/app/infra#/metrics/inventory?waffleFilter=(expression:'${encodeURIComponent(
            ips
          )}',kind:kuery)`
        );
  };
  return buildHref(summary.state.checks || [], 'monitor.ip', getHref);
};
