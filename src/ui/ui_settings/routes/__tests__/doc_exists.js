import expect from 'expect.js';
import sinon from 'sinon';

import {
  getServices,
  chance,
  assertSinonMatch,
} from './lib';

export function docExistsSuite() {
  async function setup(options = {}) {
    const {
      initialSettings
    } = options;

    const { kbnServer, uiSettings, callCluster } = getServices();

    // delete the kibana index to ensure we start fresh
    await callCluster('indices.delete', {
      index: kbnServer.config.get('kibana.index'),
      ignore: [404]
    });

    // write a setting to create kibana index and savedConfig
    await kbnServer.inject({
      method: 'POST',
      url: '/api/kibana/settings/defaultIndex',
      payload: { value: 'abc' }
    });

    // delete our defaultIndex setting to make doc empty
    await kbnServer.inject({
      method: 'DELETE',
      url: '/api/kibana/settings/defaultIndex',
    });

    if (initialSettings) {
      await uiSettings.setMany(initialSettings);
    }

    return { kbnServer, uiSettings };
  }

  describe('get route', () => {
    it('returns a 200 and includes userValues', async () => {
      const defaultIndex = chance.word({ length: 10 });
      const { kbnServer } = await setup({
        initialSettings: {
          defaultIndex
        }
      });

      const { statusCode, result } = await kbnServer.inject({
        method: 'GET',
        url: '/api/kibana/settings'
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

  describe('set route', () => {
    it('returns a 200 and all values including update', async () => {
      const { kbnServer } = await setup();

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
    });
  });

  describe('setMany route', () => {
    it('returns a 200 and all values including updates', async () => {
      const { kbnServer } = await setup();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings',
        payload: {
          changes: {
            defaultIndex
          }
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
    it('returns a 200 and deletes the setting', async () => {
      const defaultIndex = chance.word({ length: 10 });

      const { kbnServer, uiSettings } = await setup({
        initialSettings: { defaultIndex }
      });

      expect(await uiSettings.get('defaultIndex')).to.be(defaultIndex);

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
