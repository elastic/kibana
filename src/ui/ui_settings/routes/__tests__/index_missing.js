import expect from 'expect.js';

import {
  getServices,
  chance,
  assertServiceUnavailableResponse,
  waitUntilNextHealthCheck,
} from './lib';

export function indexMissingSuite() {
  beforeEach(waitUntilNextHealthCheck);

  async function setup() {
    const { callCluster, kbnServer } = getServices();
    const indexName = kbnServer.config.get('kibana.index');

    // delete the kibana index and run the test, we have about 2 seconds
    // before the healthCheck runs again, that SHOULD be enough time
    await callCluster('indices.delete', {
      index: indexName,
    });

    return {
      kbnServer,

      // an incorrect number of shards is how we determine when the index was not created by Kibana,
      // but automatically by writing to es when index didn't exist
      async assertNoKibanaIndex() {
        const resp = await callCluster('indices.delete', {
          index: indexName,
          ignore: [404]
        });
        expect(resp).to.have.property('status', 404);
      }
    };
  }

  afterEach(async () => {
    const { kbnServer, callCluster } = getServices();
    await callCluster('indices.delete', {
      index: kbnServer.config.get('kibana.index'),
      ignore: 404
    });
  });

  describe('get route', () => {
    it('returns a 200 and with empty values', async () => {
      const { kbnServer } = await setup();

      const { statusCode, result } = await kbnServer.inject({
        method: 'GET',
        url: '/api/kibana/settings'
      });

      expect(statusCode).to.be(200);
      expect(result).to.eql({ settings: {} });
    });
  });

  describe('set route', () => {
    it('returns a 503 and does not create the kibana index', async () => {
      const { kbnServer, assertNoKibanaIndex } = await setup();

      assertServiceUnavailableResponse(await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings/defaultIndex',
        payload: {
          value: chance.word()
        }
      }));

      await assertNoKibanaIndex();
    });
  });

  describe('setMany route', () => {
    it('returns a 503 and does not create the kibana index', async () => {
      const { kbnServer, assertNoKibanaIndex } = await setup();

      assertServiceUnavailableResponse(await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings',
        payload: {
          changes: {
            defaultIndex: chance.word()
          }
        }
      }));

      await assertNoKibanaIndex();
    });
  });

  describe('delete route', () => {
    it('returns a 503 and does not create the kibana index', async () => {
      const { kbnServer, assertNoKibanaIndex } = await setup();

      assertServiceUnavailableResponse(await kbnServer.inject({
        method: 'DELETE',
        url: '/api/kibana/settings/defaultIndex'
      }));

      await assertNoKibanaIndex();
    });
  });
}
