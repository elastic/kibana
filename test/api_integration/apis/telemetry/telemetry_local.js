/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import _ from 'lodash';
import { basicUiCounters } from './__fixtures__/ui_counters';
/*
 * Create a single-level array with strings for all the paths to values in the
 * source object, up to 3 deep. Going deeper than 3 causes a bit too much churn
 * in the tests.
 */
function flatKeys(source) {
  const recursivelyFlatKeys = (obj, path = [], depth = 0) => {
    return depth < 3 && _.isObject(obj)
      ? _.map(obj, (v, k) => recursivelyFlatKeys(v, [...path, k], depth + 1))
      : path.join('.');
  };

  return _.uniq(_.flattenDeep(recursivelyFlatKeys(source))).sort((a, b) => a.localeCompare(b));
}

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('/api/telemetry/v2/clusters/_stats', () => {
    before('make sure there are some saved objects', () => esArchiver.load('saved_objects/basic'));
    after('cleanup saved objects changes', () => esArchiver.unload('saved_objects/basic'));

    before('create some telemetry-data tracked indices', async () => {
      await es.indices.create({ index: 'filebeat-telemetry_tests_logs' });
    });

    after('cleanup telemetry-data tracked indices', async () => {
      await es.indices.delete({ index: 'filebeat-telemetry_tests_logs' });
    });

    it('should pull local stats and validate data types', async () => {
      const { body } = await supertest
        .post('/api/telemetry/v2/clusters/_stats')
        .set('kbn-xsrf', 'xxx')
        .send({ unencrypted: true })
        .expect(200);

      expect(body.length).to.be(1);
      const stats = body[0];
      expect(stats.collection).to.be('local');
      expect(stats.collectionSource).to.be('local');
      expect(stats.license).to.be.undefined; // OSS cannot get the license
      expect(stats.stack_stats.kibana.count).to.be.a('number');
      expect(stats.stack_stats.kibana.indices).to.be.a('number');
      expect(stats.stack_stats.kibana.os.platforms[0].platform).to.be.a('string');
      expect(stats.stack_stats.kibana.os.platforms[0].count).to.be(1);
      expect(stats.stack_stats.kibana.os.platformReleases[0].platformRelease).to.be.a('string');
      expect(stats.stack_stats.kibana.os.platformReleases[0].count).to.be(1);
      expect(stats.stack_stats.kibana.plugins.telemetry.opt_in_status).to.be(false);
      expect(stats.stack_stats.kibana.plugins.telemetry.usage_fetcher).to.be.a('string');
      expect(stats.stack_stats.kibana.plugins.stack_management).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.ui_metric).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.ui_counters).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.application_usage).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.kql.defaultQueryLanguage).to.be.a('string');
      expect(stats.stack_stats.kibana.plugins['tsvb-validation']).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.localization).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.csp.strict).to.be(true);
      expect(stats.stack_stats.kibana.plugins.csp.warnLegacyBrowsers).to.be(true);
      expect(stats.stack_stats.kibana.plugins.csp.rulesChangedFromDefault).to.be(false);

      // Testing stack_stats.data
      expect(stats.stack_stats.data).to.be.an('object');
      expect(stats.stack_stats.data).to.be.an('array');
      expect(stats.stack_stats.data[0]).to.be.an('object');
      expect(stats.stack_stats.data[0].pattern_name).to.be('filebeat');
      expect(stats.stack_stats.data[0].shipper).to.be('filebeat');
      expect(stats.stack_stats.data[0].index_count).to.be(1);
      expect(stats.stack_stats.data[0].doc_count).to.be(0);
      expect(stats.stack_stats.data[0].ecs_index_count).to.be(0);
      expect(stats.stack_stats.data[0].size_in_bytes).to.be.a('number');
    });

    describe('UI Counters telemetry', () => {
      before('Add UI Counters saved objects', () => esArchiver.load('saved_objects/ui_counters'));
      after('cleanup saved objects changes', () => esArchiver.unload('saved_objects/ui_counters'));
      it('returns ui counters aggregated by day', async () => {
        const { body } = await supertest
          .post('/api/telemetry/v2/clusters/_stats')
          .set('kbn-xsrf', 'xxx')
          .send({ unencrypted: true })
          .expect(200);

        expect(body.length).to.be(1);
        const stats = body[0];
        expect(stats.stack_stats.kibana.plugins.ui_counters).to.eql(basicUiCounters);
      });
    });

    it('should pull local stats and validate fields', async () => {
      const { body } = await supertest
        .post('/api/telemetry/v2/clusters/_stats')
        .set('kbn-xsrf', 'xxx')
        .send({ unencrypted: true })
        .expect(200);

      const stats = body[0];

      const actual = flatKeys(stats);
      expect(actual).to.be.an('array');
      const expected = [
        'cluster_name',
        'cluster_stats.cluster_uuid',
        'cluster_stats.indices.analysis',
        'cluster_stats.indices.completion',
        'cluster_stats.indices.count',
        'cluster_stats.indices.docs',
        'cluster_stats.indices.fielddata',
        'cluster_stats.indices.mappings',
        'cluster_stats.indices.query_cache',
        'cluster_stats.indices.segments',
        'cluster_stats.indices.shards',
        'cluster_stats.indices.store',
        'cluster_stats.nodes.count',
        'cluster_stats.nodes.discovery_types',
        'cluster_stats.nodes.fs',
        'cluster_stats.nodes.ingest',
        'cluster_stats.nodes.jvm',
        'cluster_stats.nodes.network_types',
        'cluster_stats.nodes.os',
        'cluster_stats.nodes.packaging_types',
        'cluster_stats.nodes.plugins',
        'cluster_stats.nodes.process',
        'cluster_stats.nodes.versions',
        'cluster_stats.nodes.usage',
        'cluster_stats.status',
        'cluster_stats.timestamp',
        'cluster_uuid',
        'collection',
        'collectionSource',
        'stack_stats.kibana.count',
        'stack_stats.kibana.indices',
        'stack_stats.kibana.os',
        'stack_stats.kibana.plugins',
        'stack_stats.kibana.versions',
        'timestamp',
        'version',
      ];

      expect(expected.every((m) => actual.includes(m))).to.be.ok();
    });

    describe('application usage limits', () => {
      function createSavedObject() {
        return supertest
          .post('/api/saved_objects/application_usage_transactional')
          .send({
            attributes: {
              appId: 'test-app',
              minutesOnScreen: 10.99,
              numberOfClicks: 10,
              timestamp: new Date().toISOString(),
            },
          })
          .expect(200)
          .then((resp) => resp.body.id);
      }

      describe('basic behaviour', () => {
        let savedObjectId;
        before('create 1 entry', async () => {
          return createSavedObject().then((id) => (savedObjectId = id));
        });
        after('cleanup', () => {
          return supertest
            .delete(`/api/saved_objects/application_usage_transactional/${savedObjectId}`)
            .expect(200);
        });

        it('should return application_usage data', async () => {
          const { body } = await supertest
            .post('/api/telemetry/v2/clusters/_stats')
            .set('kbn-xsrf', 'xxx')
            .send({ unencrypted: true })
            .expect(200);

          expect(body.length).to.be(1);
          const stats = body[0];
          expect(stats.stack_stats.kibana.plugins.application_usage).to.eql({
            'test-app': {
              clicks_total: 10,
              clicks_7_days: 10,
              clicks_30_days: 10,
              clicks_90_days: 10,
              minutes_on_screen_total: 10.99,
              minutes_on_screen_7_days: 10.99,
              minutes_on_screen_30_days: 10.99,
              minutes_on_screen_90_days: 10.99,
            },
          });
        });
      });

      describe('10k + 1', () => {
        const savedObjectIds = [];
        before('create 10k + 1 entries for application usage', async () => {
          await supertest
            .post('/api/saved_objects/_bulk_create')
            .send(
              new Array(10001).fill(0).map(() => ({
                type: 'application_usage_transactional',
                attributes: {
                  appId: 'test-app',
                  minutesOnScreen: 1,
                  numberOfClicks: 1,
                  timestamp: new Date().toISOString(),
                },
              }))
            )
            .expect(200)
            .then((resp) => resp.body.saved_objects.forEach(({ id }) => savedObjectIds.push(id)));
        });
        after('clean them all', async () => {
          // The SavedObjects API does not allow bulk deleting, and deleting one by one takes ages and the tests timeout
          await es.deleteByQuery({
            index: '.kibana',
            body: { query: { term: { type: 'application_usage_transactional' } } },
          });
        });

        it("should only use the first 10k docs for the application_usage data (they'll be rolled up in a later process)", async () => {
          const { body } = await supertest
            .post('/api/telemetry/v2/clusters/_stats')
            .set('kbn-xsrf', 'xxx')
            .send({ unencrypted: true })
            .expect(200);

          expect(body.length).to.be(1);
          const stats = body[0];
          expect(stats.stack_stats.kibana.plugins.application_usage).to.eql({
            'test-app': {
              clicks_total: 10000,
              clicks_7_days: 10000,
              clicks_30_days: 10000,
              clicks_90_days: 10000,
              minutes_on_screen_total: 10000,
              minutes_on_screen_7_days: 10000,
              minutes_on_screen_30_days: 10000,
              minutes_on_screen_90_days: 10000,
            },
          });
        });
      });
    });
  });
}
