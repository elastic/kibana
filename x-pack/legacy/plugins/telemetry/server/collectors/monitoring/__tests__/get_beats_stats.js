/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchBeatsStats, processResults } from '../get_beats_stats';
import sinon from 'sinon';
import expect from '@kbn/expect';
import beatsStatsResultSet from './fixtures/beats_stats_results';

const getBaseOptions = () => ({
  clusters: {},
  clusterHostSets: {},
  clusterInputSets: {},
  clusterModuleSets: {},
  clusterArchitectureMaps: {}
});

describe('Get Beats Stats', () => {
  describe('fetchBeatsStats', () => {
    const clusterUuids = ['aCluster', 'bCluster', 'cCluster'];
    const start = 100;
    const end = 200;
    let server;
    let callCluster;

    beforeEach(() => {
      const getStub = { get: sinon.stub() };
      getStub.get
        .withArgs('xpack.monitoring.beats.index_pattern')
        .returns('beats-indices-*');
      server = { config: () => getStub };
      callCluster = sinon.stub();
    });

    it('should set `from: 0, to: 10000` in the query', () => {
      fetchBeatsStats(server, callCluster, clusterUuids, start, end);
      const { args } = callCluster.firstCall;
      const [api, { body }] = args;

      expect(api).to.be('search');
      expect(body.from).to.be(0);
      expect(body.size).to.be(10000);
    });

    it('should set `from: 10000, from: 10000` in the query', () => {
      fetchBeatsStats(server, callCluster, clusterUuids, start, end, { page: 1 });
      const { args } = callCluster.firstCall;
      const [api, { body }] = args;

      expect(api).to.be('search');
      expect(body.from).to.be(10000);
      expect(body.size).to.be(10000);
    });

    it('should set `from: 20000, from: 10000` in the query', () => {
      fetchBeatsStats(server, callCluster, clusterUuids, start, end, { page: 2 });
      const { args } = callCluster.firstCall;
      const [api, { body }] = args;

      expect(api).to.be('search');
      expect(body.from).to.be(20000);
      expect(body.size).to.be(10000);
    });
  });

  describe('processResults', () => {
    it('should summarize empty results', () => {
      const resultsEmpty = undefined;

      const options = getBaseOptions();
      processResults(resultsEmpty, options);

      expect(options.clusters).to.eql({});
    });

    it('should summarize single result with some missing fields', () => {
      const results = {
        hits: {
          hits: [
            {
              _source: {
                type: 'beats_stats',
                cluster_uuid: 'FlV4ckTxQ0a78hmBkzzc9A',
                beats_stats: {
                  metrics: { libbeat: { output: { type: 'elasticsearch' } } }, // missing events published
                  beat: { type: 'cowbeat' }, // missing version and output
                },
              },
            },
          ],
        },
      };

      const options = getBaseOptions();
      processResults(results, options);

      expect(options.clusters).to.eql({
        FlV4ckTxQ0a78hmBkzzc9A: {
          count: 1,
          versions: {},
          types: { cowbeat: 1 },
          outputs: { elasticsearch: 1 },
          eventsPublished: 0,
          hosts: 0,
          input: {
            count: 0,
            names: [],
          },
          module: {
            count: 0,
            names: [],
          },
          architecture: {
            count: 0,
            architectures: []
          }
        },
      });
    });

    it('should summarize stats from hits across multiple result objects', () => {

      const options = getBaseOptions();

      // beatsStatsResultSet is an array of many small query results
      beatsStatsResultSet.forEach(results => {
        processResults(results, options);
      });

      expect(options.clusters).to.eql({
        W7hppdX7R229Oy3KQbZrTw: {
          count: 5,
          versions: { '7.0.0-alpha1': 5 },
          types: { metricbeat: 1, filebeat: 4 },
          outputs: { elasticsearch: 5 },
          eventsPublished: 80875,
          hosts: 1,
          module: {
            count: 1,
            names: [ 'ferrari' ],
          },
          input: {
            count: 1,
            names: [ 'firehose' ],
          },
          architecture: {
            count: 1,
            architectures: [
              {
                architecture: 'x86_64',
                count: 1,
                name: 'darwin'
              }
            ]
          },
          heartbeat: {
            endpoints: 4,
            http: {
              endpoints: 1,
              monitors: 1
            },
            icmp: {
              monitors: 0,
              endpoints: 0
            },
            tcp: {
              monitors: 2,
              endpoints: 3
            },
            monitors: 3
          }
        },
        FlV4ckTxQ0a78hmBkzzc9A: {
          count: 405,
          versions: { '7.0.0-alpha1': 405 },
          types: {
            filebeat: 200,
            metricbeat: 100,
            heartbeat: 100,
            winlogbeat: 1,
            duckbeat: 1,
            'apm-server': 1,
            sheepbeat: 1,
            cowbeat: 1,
          },
          outputs: { elasticsearch: 405 },
          eventsPublished: 723985,
          hosts: 1,
          input: {
            count: 0,
            names: [],
          },
          module: {
            count: 0,
            names: [],
          },
          architecture: {
            count: 0,
            architectures: []
          }
        },
      });
    });
  });
});
