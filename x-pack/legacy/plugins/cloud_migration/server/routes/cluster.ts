/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import axios from 'axios';
import { Router, RouterRouteHandler } from '../../../../server/lib/create_router';

import { LocalClusterState } from '../../common/types';

import { Plugins } from '../shim';

const getServerGeoId = async (): Promise<{ country: string; continent: string }> => {
  // GeoIP the server
  const axiosOptions = {
    headers: {
      'Content-Type': 'application/json',
      'X-Routing-Key': 'super-secret',
    },
    validateStatus: () => true,
  };
  const {
    data: { ip },
  } = await axios.get('http://ipinfo.io', axiosOptions);

  const {
    data: { country, continent },
  } = await axios.get(`http://www.iplocate.io/api/lookup/${ip}`, axiosOptions);

  return { country, continent };
};

export function registerClusterRoutes(router: Router, plugins: Plugins) {
  const xpackMainPlugin = plugins.xpack_main;

  const getClusterStateHandler: RouterRouteHandler = async (req, callWithRequest): Promise<any> => {
    const clusterStats = await callWithRequest('cloudMigration.clusterStats');
    const { country, continent } = await getServerGeoId();
    const { features } = xpackMainPlugin.info.toJSON();

    const clusterState: LocalClusterState = {
      name: clusterStats.cluster_name,
      version: clusterStats.nodes.versions[0],
      nodes: {
        total: clusterStats.nodes.count.total,
      },
      indices: {
        shards: {
          replication: clusterStats.indices.shards.replication,
          total: clusterStats.indices.shards.total,
        },
      },
      os: {
        memory: clusterStats.nodes.os.mem.total_in_bytes,
        processors: clusterStats.nodes.os.available_processors,
      },
      plugins: {
        apm: Boolean(features.apm && features.apm.available && features.apm.enabled),
        ml: Boolean(features.ml && features.ml.available && features.ml.enabled),
        monitoring: Boolean(
          features.monitoring && features.monitoring.available && features.monitoring.enabled
        ),
      },
      geoLocalisation: {
        country,
        continent,
      },
    };

    return clusterState;
  };

  /**
   * Map Router paths to handlers
   */
  router.get('/cluster/state', getClusterStateHandler);
}
