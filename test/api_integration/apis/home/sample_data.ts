/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const MILLISECOND_IN_WEEK = 1000 * 60 * 60 * 24 * 7;
  const SPACES = ['default', 'other'];
  const FLIGHTS_OVERVIEW_DASHBOARD_ID = '7adfa750-4c81-11e8-b3d7-01146121b73d'; // default ID of the flights overview dashboard
  const FLIGHTS_CANVAS_APPLINK_PATH =
    '/app/canvas#/workpad/workpad-a474e74b-aedc-47c3-894a-db77e62c41e0'; // includes default ID of the flights canvas applink path

  describe('sample data apis', () => {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
    });
    after(async () => {
      await esArchiver.emptyKibanaIndex();
    });

    for (const space of SPACES) {
      const apiPath = `/s/${space}/api/sample_data`;

      describe(`uninstall in the ${space} space (before install)`, () => {
        it('should fail to uninstall sample data', async () => {
          const resp = await supertest
            .delete(`${apiPath}/flights`)
            .set('kbn-xsrf', 'kibana')
            .expect(404);
          expect(resp.body.message).to.be(
            `Unable to delete sample data index "kibana_sample_data_flights", error: index_not_found_exception`
          );
        });
      });
    }

    for (const space of SPACES) {
      const apiPath = `/s/${space}/api/sample_data`;

      describe(`list in the ${space} space (before install)`, () => {
        it('should return list of sample data sets with installed status', async () => {
          const resp = await supertest.get(apiPath).set('kbn-xsrf', 'kibana').expect(200);

          expect(resp.body).to.be.an('array');
          expect(resp.body.length).to.be.above(0);
          const [flightsData] = resp.body;
          expect(flightsData.id).to.be('flights');
          expect(flightsData.status).to.be('not_installed');
          // Check and make sure the sample dataset reflects the default object IDs, because no sample data objects exist.
          // Instead of checking each object ID, we check the dashboard as a representative.
          expect(flightsData.overviewDashboard).to.be(FLIGHTS_OVERVIEW_DASHBOARD_ID);
          expect(flightsData.appLinks[0].path).to.be(FLIGHTS_CANVAS_APPLINK_PATH);
        });
      });

      describe(`install in the ${space} space`, () => {
        it('should return 404 if id does not match any sample data sets', async () => {
          await supertest.post(`${apiPath}/xxxx`).set('kbn-xsrf', 'kibana').expect(404);
        });

        it('should return 200 if success', async () => {
          const resp = await supertest
            .post(`${apiPath}/flights`)
            .set('kbn-xsrf', 'kibana')
            .expect(200);

          expect(resp.body).to.eql({
            elasticsearchIndicesCreated: { kibana_sample_data_flights: 13059 },
            kibanaSavedObjectsLoaded: 11,
          });
        });

        it('should load elasticsearch index containing sample data with dates relative to current time', async () => {
          const resp = await es.search<{ timestamp: string }>({
            index: 'kibana_sample_data_flights',
          });

          const doc = resp.hits.hits[0];
          const docMilliseconds = Date.parse(doc._source!.timestamp);
          const nowMilliseconds = Date.now();
          const delta = Math.abs(nowMilliseconds - docMilliseconds);
          expect(delta).to.be.lessThan(MILLISECOND_IN_WEEK * 4);
        });

        describe('parameters', () => {
          it('should load elasticsearch index containing sample data with dates relative to now parameter', async () => {
            const nowString = `2000-01-01T00:00:00`;
            await supertest.post(`${apiPath}/flights?now=${nowString}`).set('kbn-xsrf', 'kibana');

            const resp = await es.search<{ timestamp: string }>({
              index: 'kibana_sample_data_flights',
            });

            const doc = resp.hits.hits[0];
            const docMilliseconds = Date.parse(doc._source!.timestamp);
            const nowMilliseconds = Date.parse(nowString);
            const delta = Math.abs(nowMilliseconds - docMilliseconds);
            expect(delta).to.be.lessThan(MILLISECOND_IN_WEEK * 4);
          });
        });
      });

      describe(`list in the ${space} space (after install)`, () => {
        it('should return list of sample data sets with installed status', async () => {
          const resp = await supertest.get(apiPath).set('kbn-xsrf', 'kibana').expect(200);

          expect(resp.body).to.be.an('array');
          expect(resp.body.length).to.be.above(0);
          const [flightsData] = resp.body;
          expect(flightsData.id).to.be('flights');
          expect(flightsData.status).to.be('installed');
          // Check and make sure the sample dataset reflects the existing object IDs in each space.
          // Instead of checking each object ID, we check the dashboard as a representative.
          if (space === 'default') {
            expect(flightsData.overviewDashboard).to.be(FLIGHTS_OVERVIEW_DASHBOARD_ID);
            expect(flightsData.appLinks[0].path).to.be(FLIGHTS_CANVAS_APPLINK_PATH);
          } else {
            // the sample data objects installed in the 'other' space had their IDs regenerated upon import
            expect(flightsData.overviewDashboard).not.to.be(FLIGHTS_OVERVIEW_DASHBOARD_ID);
            expect(flightsData.appLinks[0].path).not.to.be(FLIGHTS_CANVAS_APPLINK_PATH);
          }
        });
      });
    }

    for (const space of SPACES) {
      const apiPath = `/s/${space}/api/sample_data`;

      describe(`uninstall in the ${space} space`, () => {
        it('should uninstall sample data', async () => {
          if (space === 'other') {
            // the ES index was deleted in the test for the default space; recreate it so the second uninstall doesn't fail
            await es.indices.create({ index: 'kibana_sample_data_flights' });
          }
          await supertest.delete(`${apiPath}/flights`).set('kbn-xsrf', 'kibana').expect(204);
        });

        it('should remove elasticsearch index containing sample data', async () => {
          const resp = await es.indices.exists({
            index: 'kibana_sample_data_flights',
          });
          expect(resp).to.be(false);
        });
      });

      describe(`list in the ${space} space (after uninstall)`, () => {
        it('should return list of sample data sets with installed status', async () => {
          const resp = await supertest.get(apiPath).set('kbn-xsrf', 'kibana').expect(200);

          expect(resp.body).to.be.an('array');
          expect(resp.body.length).to.be.above(0);
          const [flightsData] = resp.body;
          expect(flightsData.id).to.be('flights');
          expect(flightsData.status).to.be('not_installed');
          // Check and make sure the sample dataset reflects the default object IDs, because no sample data objects exist.
          // Instead of checking each object ID, we check the dashboard as a representative.
          expect(flightsData.overviewDashboard).to.be(FLIGHTS_OVERVIEW_DASHBOARD_ID);
          expect(flightsData.appLinks[0].path).to.be(FLIGHTS_CANVAS_APPLINK_PATH);
        });
      });
    }
  });
}
