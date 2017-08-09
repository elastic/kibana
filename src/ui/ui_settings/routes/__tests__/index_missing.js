import expect from 'expect.js';

import {
  getServices,
  chance,
  assertDocMissingResponse
} from './lib';

export function indexMissingSuite() {
  beforeEach(async function () {
    const { kbnServer } = getServices();
    await kbnServer.server.plugins.elasticsearch.waitUntilReady();
  });

  function getNumberOfShards(index) {
    return parseInt(Object.values(index)[0].settings.index.number_of_shards, 10);
  }

  async function getIndex(callCluster, indexName) {
    return await callCluster('indices.get', {
      index: indexName,
    });
  }

  async function setup() {
    const { callCluster, kbnServer } = getServices();
    const indexName = kbnServer.config.get('kibana.index');
    const initialIndex = await getIndex(callCluster, indexName);

    await callCluster('indices.delete', {
      index: indexName,
    });

    return {
      kbnServer,

      // an incorrect number of shards is how we determine when the index was not created by Kibana,
      // but automatically by writing to es when index didn't exist
      async assertInvalidKibanaIndex() {
        const index = await getIndex(callCluster, indexName);

        expect(getNumberOfShards(index))
        .to.not.be(getNumberOfShards(initialIndex));
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
    it('creates an invalid Kibana index and returns a 404 document missing error', async () => {
      const { kbnServer, assertInvalidKibanaIndex } = await setup();

      assertDocMissingResponse(await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings/defaultIndex',
        payload: {
          value: chance.word()
        }
      }));

      await assertInvalidKibanaIndex();
    });
  });

  describe('setMany route', () => {
    it('creates an invalid Kibana index and returns a 404 document missing error', async () => {
      const { kbnServer, assertInvalidKibanaIndex } = await setup();

      assertDocMissingResponse(await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings',
        payload: {
          changes: {
            defaultIndex: chance.word()
          }
        }
      }));

      await assertInvalidKibanaIndex();
    });
  });

  describe('delete route', () => {
    it('creates an invalid Kibana index and returns a 404 document missing error', async () => {
      const { kbnServer, assertInvalidKibanaIndex } = await setup();

      assertDocMissingResponse(await kbnServer.inject({
        method: 'DELETE',
        url: '/api/kibana/settings/defaultIndex'
      }));

      await assertInvalidKibanaIndex();
    });
  });
}
