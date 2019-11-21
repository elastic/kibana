/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

/**
 * This model deals with a cluster object from ES and converts it to Kibana downstream
 */
export class Cluster {
  constructor(props) {
    this.uuid = props.uuid;
  }

  get downstreamJSON() {
    const json = {
      uuid: this.uuid,
    };

    return json;
  }

  // generate Pipeline object from elasticsearch response
  static fromUpstreamJSON(upstreamCluster) {
    const uuid = get(upstreamCluster, 'cluster_uuid');
    return new Cluster({ uuid });
  }
}
