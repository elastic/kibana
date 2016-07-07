import { isEqual } from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import init from '..';
import defaultsProvider from '../defaults';

describe('ui settings', function () {
  describe('overview', function () {
    it('has expected api surface', function () {
      const { uiSettings } = instantiate();
      expect(typeof uiSettings.get).to.equal('function');
      expect(typeof uiSettings.getAll).to.equal('function');
      expect(typeof uiSettings.getDefaults).to.equal('function');
      expect(typeof uiSettings.getRaw).to.equal('function');
      expect(typeof uiSettings.getUserProvided).to.equal('function');
      expect(typeof uiSettings.remove).to.equal('function');
      expect(typeof uiSettings.removeMany).to.equal('function');
      expect(typeof uiSettings.set).to.equal('function');
      expect(typeof uiSettings.setMany).to.equal('function');
    });
  });

  describe('#setMany()', function () {
    it('returns a promise', () => {
      const { uiSettings } = instantiate();
      const result = uiSettings.setMany({ a: 'b' });
      expect(result).to.be.a(Promise);
    });

    it('updates a single value in one operation', function () {
      const { server, uiSettings, configGet } = instantiate();
      const result = uiSettings.setMany({ one: 'value' });
      expectElasticsearchUpdateQuery(server, configGet, {
        one: 'value'
      });
    });

    it('updates several values in one operation', function () {
      const { server, uiSettings, configGet } = instantiate();
      const result = uiSettings.setMany({ one: 'value', another: 'val' });
      expectElasticsearchUpdateQuery(server, configGet, {
        one: 'value', another: 'val'
      });
    });
  });

  describe('#set()', function () {
    it('returns a promise', () => {
      const { uiSettings } = instantiate();
      const result = uiSettings.set('a', 'b');
      expect(result).to.be.a(Promise);
    });

    it('updates single values by (key, value)', function () {
      const { server, uiSettings, configGet } = instantiate();
      const result = uiSettings.set('one', 'value');
      expectElasticsearchUpdateQuery(server, configGet, {
        one: 'value'
      });
    });
  });

  describe('#remove()', function () {
    it('returns a promise', () => {
      const { uiSettings } = instantiate();
      const result = uiSettings.remove('one');
      expect(result).to.be.a(Promise);
    });

    it('removes single values by key', function () {
      const { server, uiSettings, configGet } = instantiate();
      const result = uiSettings.remove('one');
      expectElasticsearchUpdateQuery(server, configGet, {
        one: null
      });
    });
  });

  describe('#removeMany()', function () {
    it('returns a promise', () => {
      const { uiSettings } = instantiate();
      const result = uiSettings.removeMany(['one']);
      expect(result).to.be.a(Promise);
    });

    it('removes a single value', function () {
      const { server, uiSettings, configGet } = instantiate();
      const result = uiSettings.removeMany(['one']);
      expectElasticsearchUpdateQuery(server, configGet, {
        one: null
      });
    });

    it('updates several values in one operation', function () {
      const { server, uiSettings, configGet } = instantiate();
      const result = uiSettings.removeMany(['one', 'two', 'three']);
      expectElasticsearchUpdateQuery(server, configGet, {
        one: null, two: null, three: null
      });
    });
  });

  describe('#getDefaults()', function () {
    it('is promised the default values', async function () {
      const { server, uiSettings, configGet } = instantiate();
      const defaults = await uiSettings.getDefaults();
      expect(isEqual(defaults, defaultsProvider())).to.equal(true);
    });
  });

  describe('#getUserProvided()', function () {
    it('pulls user configuration from ES', async function () {
      const getResult = { user: 'customized' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getUserProvided();
      expectElasticsearchGetQuery(server, configGet);
    });

    it('returns user configuration', async function () {
      const getResult = { user: 'customized' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getUserProvided();
      expect(isEqual(result, {
        user: { userValue: 'customized' }
      })).to.equal(true);
    });

    it('ignores null user configuration (because default values)', async function () {
      const getResult = { user: 'customized', usingDefault: null, something: 'else' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getUserProvided();
      expect(isEqual(result, {
        user: { userValue: 'customized' }, something: { userValue: 'else' }
      })).to.equal(true);
    });
  });

  describe('#getRaw()', function () {
    it('pulls user configuration from ES', async function () {
      const getResult = {};
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getRaw();
      expectElasticsearchGetQuery(server, configGet);
    });

    it(`without user configuration it's equal to the defaults`, async function () {
      const getResult = {};
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getRaw();
      expect(isEqual(result, defaultsProvider())).to.equal(true);
    });

    it(`user configuration gets merged with defaults`, async function () {
      const getResult = { foo: 'bar' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getRaw();
      const merged = defaultsProvider();
      merged.foo = { userValue: 'bar' };
      expect(isEqual(result, merged)).to.equal(true);
    });

    it(`user configuration gets merged into defaults`, async function () {
      const getResult = { dateFormat: 'YYYY-MM-DD' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getRaw();
      const merged = defaultsProvider();
      merged.dateFormat.userValue = 'YYYY-MM-DD';
      expect(isEqual(result, merged)).to.equal(true);
    });
  });

  describe('#getAll()', function () {
    it('pulls user configuration from ES', async function () {
      const getResult = {};
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getAll();
      expectElasticsearchGetQuery(server, configGet);
    });

    it(`returns key value pairs`, async function () {
      const getResult = {};
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getAll();
      const defaults = defaultsProvider();
      const expectation = {};
      Object.keys(defaults).forEach(key => {
        expectation[key] = defaults[key].value;
      });
      expect(isEqual(result, expectation)).to.equal(true);
    });

    it(`returns key value pairs including user configuration`, async function () {
      const getResult = { something: 'user-provided' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getAll();
      const defaults = defaultsProvider();
      const expectation = {};
      Object.keys(defaults).forEach(key => {
        expectation[key] = defaults[key].value;
      });
      expectation.something = 'user-provided';
      expect(isEqual(result, expectation)).to.equal(true);
    });

    it(`returns key value pairs including user configuration for existing settings`, async function () {
      const getResult = { dateFormat: 'YYYY-MM-DD' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getAll();
      const defaults = defaultsProvider();
      const expectation = {};
      Object.keys(defaults).forEach(key => {
        expectation[key] = defaults[key].value;
      });
      expectation.dateFormat = 'YYYY-MM-DD';
      expect(isEqual(result, expectation)).to.equal(true);
    });
  });

  describe('#get()', function () {
    it('pulls user configuration from ES', async function () {
      const getResult = {};
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.get();
      expectElasticsearchGetQuery(server, configGet);
    });

    it(`returns the promised value for a key`, async function () {
      const getResult = {};
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.get('dateFormat');
      const defaults = defaultsProvider();
      expect(result).to.equal(defaults.dateFormat.value);
    });

    it(`returns the user-configured value for a custom key`, async function () {
      const getResult = { custom: 'value' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.get('custom');
      expect(result).to.equal('value');
    });

    it(`returns the user-configured value for a modified key`, async function () {
      const getResult = { dateFormat: 'YYYY-MM-DD' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.get('dateFormat');
      expect(result).to.equal('YYYY-MM-DD');
    });
  });
});

function expectElasticsearchGetQuery(server, configGet) {
  expect(server.plugins.elasticsearch.client.get.callCount).to.equal(1);
  expect(isEqual(server.plugins.elasticsearch.client.get.firstCall.args, [{
    index: configGet('kibana.index'),
    id: configGet('pkg.version'),
    type: 'config'
  }])).to.equal(true);
}

function expectElasticsearchUpdateQuery(server, configGet, doc) {
  expect(server.plugins.elasticsearch.client.update.callCount).to.equal(1);
  expect(isEqual(server.plugins.elasticsearch.client.update.firstCall.args, [{
    index: configGet('kibana.index'),
    id: configGet('pkg.version'),
    type: 'config',
    body: { doc }
  }])).to.equal(true);
}

function instantiate({ getResult } = {}) {
  const esStatus = {
    state: 'green',
    on: sinon.spy()
  };
  const settingsStatus = {
    state: 'green',
    red: sinon.spy(),
    yellow: sinon.spy(),
    green: sinon.spy()
  };
  const kbnServer = {
    status: {
      create: sinon.stub().withArgs('ui settings').returns(settingsStatus),
      getForPluginId: sinon.stub().withArgs('elasticsearch').returns(esStatus)
    },
    ready: sinon.stub().returns(Promise.resolve())
  };
  const server = {
    decorate: (_, key, value) => server[key] = value,
    plugins: {
      elasticsearch: {
        client: {
          get: sinon.stub().returns(Promise.resolve({ _source: getResult })),
          update: sinon.stub().returns(Promise.resolve())
        }
      }
    }
  };
  const configGet = sinon.stub();
  configGet.withArgs('kibana.index').returns('.kibana');
  configGet.withArgs('pkg.version').returns('1.2.3-test');
  const config = {
    get: configGet
  };
  const setupSettings = init(kbnServer, server, config);
  const uiSettings = server.uiSettings();
  return { server, uiSettings, configGet };
}
