/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LatestMonitor } from '../../../../common/graphql/types';
import { addBasePath } from './add_base_path';
import { buildHref } from './build_href';

export const getLoggingContainerHref = (
  monitor: LatestMonitor,
  basePath: string
): string | undefined =>
  buildHref(monitor, 'ping.container.id', containerId =>
    addBasePath(
      basePath,
      `/app/infra#/logs?logFilter=${encodeURI(
        `(expression:'container.id : ${containerId}',kind:kuery)`
      )}`
    )
  );

export const getLoggingKubernetesHref = (monitor: LatestMonitor, basePath: string) =>
  buildHref(monitor, 'ping.kubernetes.pod.uid', podUID =>
    addBasePath(
      basePath,
      `/app/infra#/logs?logFilter=${encodeURI(`(expression:'pod.uid : ${podUID}',kind:kuery)`)}`
    )
  );

export const getLoggingIpHref = (monitor: LatestMonitor, basePath: string) =>
  buildHref(monitor, 'ping.monitor.ip', ip =>
    addBasePath(
      basePath,
      `/app/infra#/logs?logFilter=(expression:'${encodeURIComponent(
        `host.ip : ${ip}`
      )}',kind:kuery)`
    )
  );
