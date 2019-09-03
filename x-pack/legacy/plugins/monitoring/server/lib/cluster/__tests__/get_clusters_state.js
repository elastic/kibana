/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleResponse } from '../get_clusters_state';
import expect from '@kbn/expect';
import moment from 'moment';
import { set } from 'lodash';

const clusters = [
  {
    cluster_uuid: 'abc123'
  }
];
const clusterTimestamp = moment().format();
const response = {
  hits: {
    hits: [
      {
        _source: {
          cluster_uuid: 'abc123',
          timestamp: clusterTimestamp,
          cluster_state: {
            status: 'green',
            state_uuid: 'uuid1123',
            master_node: 'uuid1123',
            version: 14,
            nodes: {
              nodeUuid0123: {
                name: 'node01',
                uuid: 'nodeUuid0123'
              }
            }
          }
        }
      }
    ]
  }
};

describe('get_clusters_state', () => {
  it('returns an available cluster', () => {
    const result = handleResponse(response, clusters);
    expect(result).to.be(clusters);
    expect(result.length).to.be(1);
    expect(result[0].cluster_uuid).to.be('abc123');
    expect(result[0].cluster_state.master_node).to.be('uuid1123');
    expect(result[0].cluster_state.status).to.be('green');
    expect(result[0].cluster_state.state_uuid).to.be('uuid1123');
    expect(result[0].cluster_state.nodes).to.eql({ nodeUuid0123: { name: 'node01', uuid: 'nodeUuid0123' } });
  });

  it('does not filter out an unavailable cluster', () => {
    set(response, '.hits.hits[0]._source.timestamp', moment().subtract(30, 'days').format());
    const result = handleResponse(response, clusters);
    expect(result).to.be(clusters);
    expect(result.length).to.be(1);
  });
});
