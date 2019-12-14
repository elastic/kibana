/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import {
  getClusterUuids,
  fetchClusterUuids,
  handleClusterUuidsResponse,
} from '../get_cluster_uuids';

describe('get_cluster_uuids', () => {
  const callWith = sinon.stub();
  const size = 123;
  const server = {
    config: sinon.stub().returns({
      get: sinon
        .stub()
        .withArgs('xpack.monitoring.elasticsearch.index_pattern')
        .returns('.monitoring-es-N-*')
        .withArgs('xpack.monitoring.max_bucket_size')
        .returns(size),
    }),
  };
  const response = {
    aggregations: {
      cluster_uuids: {
        buckets: [{ key: 'abc' }, { key: 'xyz' }, { key: '123' }],
      },
    },
  };
  const expectedUuids = response.aggregations.cluster_uuids.buckets.map(bucket => bucket.key);
  const start = new Date();
  const end = new Date();

  describe('getClusterUuids', () => {
    it('returns cluster UUIDs', async () => {
      callWith.withArgs('search').returns(Promise.resolve(response));

      expect(await getClusterUuids(server, callWith, start, end)).to.eql(expectedUuids);
    });
  });

  describe('fetchClusterUuids', () => {
    it('searches for clusters', async () => {
      callWith.returns(Promise.resolve(response));

      expect(await fetchClusterUuids(server, callWith, start, end)).to.be(response);
    });
  });

  describe('handleClusterUuidsResponse', () => {
    // filterPath makes it easy to ignore anything unexpected because it will come back empty
    it('handles unexpected response', () => {
      const clusterUuids = handleClusterUuidsResponse({});

      expect(clusterUuids.length).to.be(0);
    });

    it('handles valid response', () => {
      const clusterUuids = handleClusterUuidsResponse(response);

      expect(clusterUuids).to.eql(expectedUuids);
    });

    it('handles no buckets response', () => {
      const clusterUuids = handleClusterUuidsResponse({
        aggregations: {
          cluster_uuids: {
            buckets: [],
          },
        },
      });

      expect(clusterUuids.length).to.be(0);
    });
  });
});
