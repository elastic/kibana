import expect from 'expect.js';

import {
  getServices,
  chance,
  assertDocMissingResponse
} from './lib';

export function docMissingSuite() {
  async function setup() {
    const { kbnServer, savedObjectsClient } = getServices();

    // delete all config docs
    const { saved_objects: objs } = await savedObjectsClient.find({ type: 'config' });

    for (const obj of objs) {
      await savedObjectsClient.delete(obj.type, obj.id);
    }

    return { kbnServer };
  }

  describe('get route', () => {
    it('returns a 200 with empty values', async () => {
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
    it('returns a 404', async () => {
      const { kbnServer } = await setup();

      assertDocMissingResponse(await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings/defaultIndex',
        payload: {
          value: chance.word()
        }
      }));
    });
  });

  describe('setMany route', () => {
    it('returns a 404', async () => {
      const { kbnServer } = await setup();

      assertDocMissingResponse(await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings',
        payload: {
          changes: {
            defaultIndex: chance.word()
          }
        }
      }));
    });
  });

  describe('delete route', () => {
    it('returns a 404', async () => {
      const { kbnServer } = await setup();

      assertDocMissingResponse(await kbnServer.inject({
        method: 'DELETE',
        url: '/api/kibana/settings/defaultIndex'
      }));
    });
  });
}
