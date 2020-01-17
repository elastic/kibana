/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

export class Cluster {
  /**
   * Represents the Elasticsearch cluster that Logstash Management is using
   * @param {object} props An object used to instantiate a cluster instance
   * @param {string} props.uuid UUID of the cluster
   */
  constructor(props) {
    this.uuid = get(props, 'uuid');
  }

  static fromUpstreamJSON(cluster) {
    return new Cluster({
      uuid: cluster.uuid,
    });
  }
}
