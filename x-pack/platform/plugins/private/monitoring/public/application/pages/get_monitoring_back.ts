/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AppHeaderBack } from '@kbn/app-header';

const clustersLabel = i18n.translate('xpack.monitoring.appHeader.back.clusters', {
  defaultMessage: 'Clusters',
});

const clusterOverviewLabel = i18n.translate('xpack.monitoring.appHeader.back.clusterOverview', {
  defaultMessage: 'Cluster overview',
});

const nodesLabel = i18n.translate('xpack.monitoring.appHeader.back.nodes', {
  defaultMessage: 'Nodes',
});

const indicesLabel = i18n.translate('xpack.monitoring.appHeader.back.indices', {
  defaultMessage: 'Indices',
});

const instancesLabel = i18n.translate('xpack.monitoring.appHeader.back.instances', {
  defaultMessage: 'Instances',
});

const pipelinesLabel = i18n.translate('xpack.monitoring.appHeader.back.pipelines', {
  defaultMessage: 'Pipelines',
});

const nodeOverviewLabel = i18n.translate('xpack.monitoring.appHeader.back.nodeOverview', {
  defaultMessage: 'Node overview',
});

const indexOverviewLabel = i18n.translate('xpack.monitoring.appHeader.back.indexOverview', {
  defaultMessage: 'Index overview',
});

const ccrLabel = i18n.translate('xpack.monitoring.appHeader.back.ccr', {
  defaultMessage: 'CCR',
});

const productRootPaths = new Set([
  '/elasticsearch',
  '/elasticsearch/nodes',
  '/elasticsearch/indices',
  '/elasticsearch/ml_jobs',
  '/elasticsearch/ccr',
  '/kibana',
  '/kibana/instances',
  '/logstash',
  '/logstash/nodes',
  '/logstash/pipelines',
  '/beats',
  '/beats/beats',
  '/apm',
  '/apm/instances',
  '/enterprise_search',
]);

export interface GetMonitoringBackOptions {
  /**
   * The cluster listing immediately redirects to overview when only one cluster
   * exists. Only offer that parent when the listing is a real destination.
   */
  hasClusterListing?: boolean;
}

/**
 * One-step AppHeader back target from the current monitoring pathname.
 */
export function getMonitoringBack(
  pathname: string,
  createHref: (route: string) => string,
  { hasClusterListing = false }: GetMonitoringBackOptions = {}
): AppHeaderBack | undefined {
  const path = pathname.replace(/\/$/, '') || '/';

  if (path === '/' || path === '/home' || path === '/no-data' || path === '/loading') {
    return undefined;
  }

  if (path === '/overview' || path === '/license') {
    if (!hasClusterListing) {
      return undefined;
    }
    return { href: createHref('/home'), label: clustersLabel };
  }

  if (productRootPaths.has(path)) {
    return { href: createHref('/overview'), label: clusterOverviewLabel };
  }

  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'elasticsearch' && segments[1] === 'nodes' && segments[2]) {
    if (segments[3] === 'advanced') {
      return {
        href: createHref(`/elasticsearch/nodes/${segments[2]}`),
        label: nodeOverviewLabel,
      };
    }
    return { href: createHref('/elasticsearch/nodes'), label: nodesLabel };
  }

  if (segments[0] === 'elasticsearch' && segments[1] === 'indices' && segments[2]) {
    if (segments[3] === 'advanced') {
      return {
        href: createHref(`/elasticsearch/indices/${segments[2]}`),
        label: indexOverviewLabel,
      };
    }
    return { href: createHref('/elasticsearch/indices'), label: indicesLabel };
  }

  if (
    segments[0] === 'elasticsearch' &&
    segments[1] === 'ccr' &&
    segments[2] &&
    segments[3] === 'shard'
  ) {
    return { href: createHref('/elasticsearch/ccr'), label: ccrLabel };
  }

  if (segments[0] === 'kibana' && segments[1] === 'instances' && segments[2]) {
    return { href: createHref('/kibana/instances'), label: instancesLabel };
  }

  if (segments[0] === 'beats' && segments[1] === 'beat' && segments[2]) {
    return { href: createHref('/beats/beats'), label: instancesLabel };
  }

  if (segments[0] === 'apm' && segments[1] === 'instances' && segments[2]) {
    return { href: createHref('/apm/instances'), label: instancesLabel };
  }

  if (segments[0] === 'logstash' && segments[1] === 'node' && segments[2]) {
    if (segments[3] === 'advanced' || segments[3] === 'pipelines') {
      return {
        href: createHref(`/logstash/node/${segments[2]}`),
        label: nodeOverviewLabel,
      };
    }
    return { href: createHref('/logstash/nodes'), label: nodesLabel };
  }

  if (segments[0] === 'logstash' && segments[1] === 'pipelines' && segments[2]) {
    return { href: createHref('/logstash/pipelines'), label: pipelinesLabel };
  }

  return undefined;
}
