import expect from 'expect.js';
import sinon from 'sinon';

import {
  getServices,
  chance,
  assertSinonMatch,
} from './lib';

export function indexMissingSuite() {
  async function setup() {
    const { callCluster, kbnServer } = getServices();
    const indexName = kbnServer.config.get('kibana.index');

    // ensure the kibana index does not exist
    await callCluster('indices.delete', {
      index: indexName,
      ignore: [404],
    });

    return {
      kbnServer,

      // an incorrect number of shards is how we determine when the index was not created by Kibana,
      // but automatically by writing to es when index didn't exist
      async assertValidKibanaIndex() {
        const resp = await callCluster('indices.get', {
          index: indexName
        });

        expect(resp[indexName].mappings).to.have.property('doc');
        expect(resp[indexName].mappings.doc.properties).to.have.keys(
          'index-pattern',
          'visualization',
          'search',
          'dashboard'
        );
      }
    };
  }

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
    it('returns a 200 and creates a valid kibana index', async () => {
      const { kbnServer, assertValidKibanaIndex } = await setup();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings/defaultIndex',
        payload: {
          value: defaultIndex
        }
      });

      expect(statusCode).to.be(200);
      assertSinonMatch(result, {
        settings: {
          buildNum: {
            userValue: sinon.match.number
          },
          defaultIndex: {
            userValue: defaultIndex
          }
        }
      });

      await assertValidKibanaIndex();
    });
  });

  describe('setMany route', () => {
    it('returns a 200 and creates a valid kibana index', async () => {
      const { kbnServer, assertValidKibanaIndex } = await setup();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings',
        payload: {
          changes: { defaultIndex }
        }
      });

      expect(statusCode).to.be(200);
      assertSinonMatch(result, {
        settings: {
          buildNum: {
            userValue: sinon.match.number
          },
          defaultIndex: {
            userValue: defaultIndex
          }
        }
      });

      await assertValidKibanaIndex();
    });
  });

  describe('delete route', () => {
    it('returns a 200 and creates a valid kibana index', async () => {
      const { kbnServer, assertValidKibanaIndex } = await setup();

      const { statusCode, result } = await kbnServer.inject({
        method: 'DELETE',
        url: '/api/kibana/settings/defaultIndex'
      });

      expect(statusCode).to.be(200);
      assertSinonMatch(result, {
        settings: {
          buildNum: {
            userValue: sinon.match.number
          }
        }
      });

      await assertValidKibanaIndex();
    });
  });
}
