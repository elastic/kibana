import expect from 'expect.js';
import sinon from 'sinon';

import {
  getServices,
  chance,
  assertSinonMatch,
} from './lib';

export function docMissingSuite() {
  // ensure the kibana index has no documents
  beforeEach(async () => {
    const { kbnServer, callCluster } = getServices();

    // write a setting to ensure kibana index is created
    await kbnServer.inject({
      method: 'POST',
      url: '/api/kibana/settings/defaultIndex',
      payload: { value: 'abc' }
    });

    // delete all docs from kibana index to ensure savedConfig is not found
    await callCluster('deleteByQuery', {
      index: kbnServer.config.get('kibana.index'),
      body: {
        query: { match_all: {} }
      }
    });
  });

  describe('get route', () => {
    it('creates doc, returns a 200 with no settings', async () => {
      const { kbnServer } = getServices();

      const { statusCode, result } = await kbnServer.inject({
        method: 'GET',
        url: '/api/kibana/settings'
      });

      expect(statusCode).to.be(200);
      assertSinonMatch(result, {
        settings: {}
      });
    });
  });

  describe('set route', () => {
    it('creates doc, returns a 200 with value set', async () => {
      const { kbnServer } = getServices();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings/defaultIndex',
        payload: { value: defaultIndex }
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
    });
  });

  describe('setMany route', () => {
    it('creates doc, returns 200 with updated values', async () => {
      const { kbnServer } = getServices();

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
    });
  });

  describe('delete route', () => {
    it('creates doc, returns a 200 with just buildNum', async () => {
      const { kbnServer } = getServices();

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
    });
  });
}
