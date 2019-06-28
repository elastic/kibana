/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorSummary } from '../../../../common/graphql/types';
import { addBasePath } from './add_base_path';
import { buildHref, buildHrefFromList } from './build_href';

export const getInfraContainerHref = (
  summary: MonitorSummary,
  basePath: string
): string | undefined => {
  const getHref = (value: string | string[]) => {
    if (!Array.isArray(value)) {
      return addBasePath(
        basePath,
        `/app/infra#/link-to/container-detail/${encodeURIComponent(value)}`
      );
    }
    return addBasePath(
      basePath,
      `/app/infra#/link-to/container-detail/${encodeURIComponent(value[0])}`
    );
  };
  return buildHrefFromList(summary.state.checks || [], 'container.id', getHref);
};

export const getInfraKubernetesHref = (
  summary: MonitorSummary,
  basePath: string
): string | undefined => {
  const getHref = (value: string | string[]) => {
    if (!Array.isArray(value)) {
      return addBasePath(basePath, `/app/infra#/link-to/pod-detail/${encodeURIComponent(value)}`);
    }
    // TODO: this link should be updated to "OR" additional pods
    return addBasePath(basePath, `/app/infra#/link-to/pod-detail/${encodeURIComponent(value[0])}`);
  };

  return buildHrefFromList(summary.state.checks || [], 'kubernetes.pod.uid', getHref);
};

export const getInfraIpHref = (summary: MonitorSummary, basePath: string) => {
  const getHref = (value: string | string[]) => {
    if (!Array.isArray(value)) {
      const expression = encodeURIComponent(`host.ip : ${value}`);
      return addBasePath(
        basePath,
        `/app/infra#/infrastructure/inventory?waffleFilter=(expression:'${expression}',kind:kuery)`
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
          `/app/infra#/infrastructure/inventory?waffleFilter=(expression:'${encodeURIComponent(
            ips
          )}',kind:kuery)`
        );
  };
  return buildHrefFromList(summary.state.checks || [], 'monitor.ip', getHref);
};
