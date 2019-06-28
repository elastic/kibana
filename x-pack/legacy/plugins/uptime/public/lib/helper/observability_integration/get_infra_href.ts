/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LatestMonitor } from '../../../../common/graphql/types';
import { addBasePath } from './add_base_path';
import { buildHref } from './build_href';

export const getInfraContainerHref = (
  monitor: LatestMonitor,
  basePath: string
): string | undefined =>
  buildHref(monitor, 'ping.container.id', containerId =>
    addBasePath(basePath, `/app/infra#/link-to/container-detail/${encodeURIComponent(containerId)}`)
  );

export const getInfraKubernetesHref = (
  monitor: LatestMonitor,
  basePath: string
): string | undefined =>
  buildHref(monitor, 'ping.kubernetes.pod.uid', uid =>
    addBasePath(basePath, `/app/infra#/link-to/pod-detail/${encodeURIComponent(uid)}`)
  );

export const getInfraIpHref = (monitor: LatestMonitor, basePath: string) =>
  buildHref(monitor, 'ping.monitor.ip', ip => {
    const expression = encodeURIComponent(`host.ip : ${ip}`);
    return addBasePath(
      basePath,
      `/app/infra#/infrastructure/inventory?waffleFilter=(expression:'${expression}',kind:kuery)`
    );
  });
