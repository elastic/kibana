/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import {
  fetchElasticsearchStats,
  getElasticsearchStats,
  handleElasticsearchStats,
} from '../get_es_stats';

describe('get_es_stats', () => {
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
    hits: {
      hits: [
        { _id: 'abc', _source: { cluster_uuid: 'abc' } },
        { _id: 'xyz', _source: { cluster_uuid: 'xyz' } },
        { _id: '123', _source: { cluster_uuid: '123' } },
      ],
    },
  };
  const expectedClusters = response.hits.hits.map(hit => hit._source);
  const clusterUuids = expectedClusters.map(cluster => cluster.cluster_uuid);

  describe('getElasticsearchStats', () => {
    it('returns clusters', async () => {
      callWith.withArgs('search').returns(Promise.resolve(response));

      expect(await getElasticsearchStats(server, callWith, clusterUuids)).to.eql(expectedClusters);
    });
  });

  describe('fetchElasticsearchStats', () => {
    it('searches for clusters', async () => {
      callWith.returns(response);

      expect(await fetchElasticsearchStats(server, callWith, clusterUuids)).to.be(response);
    });
  });

  describe('handleElasticsearchStats', () => {
    // filterPath makes it easy to ignore anything unexpected because it will come back empty
    it('handles unexpected response', () => {
      const clusters = handleElasticsearchStats({});

      expect(clusters.length).to.be(0);
    });

    it('handles valid response', () => {
      const clusters = handleElasticsearchStats(response);

      expect(clusters).to.eql(expectedClusters);
    });

    it('handles no hits response', () => {
      const clusters = handleElasticsearchStats({ hits: { hits: [] } });

      expect(clusters.length).to.be(0);
    });
  });
});
