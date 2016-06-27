import sinon from 'sinon';
import expect from 'expect.js';
import init from '..';
import defaultsProvider from '../defaults';

describe('ui settings', function () {
  describe('overview', function () {
    it('has expected api surface', function () {
      const { uiSettings } = instantiate();
      expect(typeof uiSettings.get).to.be('function');
      expect(typeof uiSettings.getAll).to.be('function');
      expect(typeof uiSettings.getDefaults).to.be('function');
      expect(typeof uiSettings.getRaw).to.be('function');
      expect(typeof uiSettings.getUserProvided).to.be('function');
      expect(typeof uiSettings.remove).to.be('function');
      expect(typeof uiSettings.set).to.be('function');
      expect(typeof uiSettings.setMany).to.be('function');
    });
  });

  describe('#setMany()', function () {
    it('updates a single value in one operation', function () {
      const { server, uiSettings, configGet } = instantiate();
      const result = uiSettings.setMany({ one: 'value' });
      expect(typeof result.then).to.be('function');
      expect(server.plugins.elasticsearch.client.update.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.update.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config',
        body: {
          doc: { one: 'value' }
        }
      }]);
    });

    it('updates several values in one operation', function () {
      const { server, uiSettings, configGet } = instantiate();
      const result = uiSettings.setMany({ one: 'value', another: 'val' });
      expect(typeof result.then).to.be('function');
      expect(server.plugins.elasticsearch.client.update.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.update.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config',
        body: {
          doc: { one: 'value', another: 'val' }
        }
      }]);
    });
  });

  describe('#set()', function () {
    it('updates single values by (key, value)', function () {
      const { server, uiSettings, configGet } = instantiate();
      const result = uiSettings.set('one', 'value');
      expect(typeof result.then).to.be('function');
      expect(server.plugins.elasticsearch.client.update.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.update.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config',
        body: {
          doc: { one: 'value' }
        }
      }]);
    });
  });

  describe('#remove()', function () {
    it('removes single values by key', function () {
      const { server, uiSettings, configGet } = instantiate();
      const result = uiSettings.remove('one');
      expect(typeof result.then).to.be('function');
      expect(server.plugins.elasticsearch.client.update.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.update.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config',
        body: {
          doc: { one: null }
        }
      }]);
    });
  });

  describe('#removeMany()', function () {
    it('removes a single value', function () {
      const { server, uiSettings, configGet } = instantiate();
      const result = uiSettings.removeMany(['one']);
      expect(typeof result.then).to.be('function');
      expect(server.plugins.elasticsearch.client.update.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.update.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config',
        body: {
          doc: { one: null }
        }
      }]);
    });

    it('updates several values in one operation', function () {
      const { server, uiSettings, configGet } = instantiate();
      const result = uiSettings.removeMany(['one', 'two', 'three']);
      expect(typeof result.then).to.be('function');
      expect(server.plugins.elasticsearch.client.update.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.update.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config',
        body: {
          doc: { one: null, two: null, three: null }
        }
      }]);
    });
  });

  describe('#getDefaults()', function () {
    it('is promised the default values', async function () {
      const { server, uiSettings, configGet } = instantiate();
      const defaults = await uiSettings.getDefaults();
      expect(defaults).eql(defaultsProvider());
    });
  });

  describe('#getUserProvided()', function () {
    it('pulls user configuration from ES', async function () {
      const getResult = { user: 'customized' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getUserProvided();
      expect(server.plugins.elasticsearch.client.get.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.get.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config'
      }]);
      expect(result).to.eql({
        user: { userValue: 'customized' }
      });
    });

    it('ignores null user configuration (because default values)', async function () {
      const getResult = { user: 'customized', usingDefault: null, something: 'else' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getUserProvided();
      expect(server.plugins.elasticsearch.client.get.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.get.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config'
      }]);
      expect(result).to.eql({
        user: { userValue: 'customized' }, something: { userValue: 'else' }
      });
    });
  });

  describe('#getRaw()', function () {
    it(`without user configuration it's equal to the defaults`, async function () {
      const getResult = {};
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getRaw();
      expect(server.plugins.elasticsearch.client.get.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.get.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config'
      }]);
      expect(result).to.eql(defaultsProvider());
    });

    it(`user configuration gets merged with defaults`, async function () {
      const getResult = { foo: 'bar' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getRaw();
      expect(server.plugins.elasticsearch.client.get.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.get.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config'
      }]);
      const merged = defaultsProvider();
      merged.foo = { userValue: 'bar' };
      expect(result).to.eql(merged);
    });

    it(`user configuration gets merged into defaults`, async function () {
      const getResult = { dateFormat: 'YYYY-MM-DD' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getRaw();
      expect(server.plugins.elasticsearch.client.get.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.get.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config'
      }]);
      const merged = defaultsProvider();
      merged.dateFormat.userValue = 'YYYY-MM-DD';
      expect(result).to.eql(merged);
    });
  });

  describe('#getAll()', function () {
    it(`returns key value pairs`, async function () {
      const getResult = {};
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getAll();
      expect(server.plugins.elasticsearch.client.get.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.get.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config'
      }]);
      const defaults = defaultsProvider();
      const expectation = {};
      Object.keys(defaults).forEach(key => {
        expectation[key] = defaults[key].value;
      });
      expect(result).to.eql(expectation);
    });

    it(`returns key value pairs including user configuration`, async function () {
      const getResult = { something: 'user-provided' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getAll();
      expect(server.plugins.elasticsearch.client.get.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.get.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config'
      }]);
      const defaults = defaultsProvider();
      const expectation = {};
      Object.keys(defaults).forEach(key => {
        expectation[key] = defaults[key].value;
      });
      expectation.something = 'user-provided';
      expect(result).to.eql(expectation);
    });

    it(`returns key value pairs including user configuration for existing settings`, async function () {
      const getResult = { dateFormat: 'YYYY-MM-DD' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.getAll();
      expect(server.plugins.elasticsearch.client.get.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.get.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config'
      }]);
      const defaults = defaultsProvider();
      const expectation = {};
      Object.keys(defaults).forEach(key => {
        expectation[key] = defaults[key].value;
      });
      expectation.dateFormat = 'YYYY-MM-DD';
      expect(result).to.eql(expectation);
    });
  });

  describe('#get()', function () {
    it(`returns the promised value for a key`, async function () {
      const getResult = {};
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.get('dateFormat');
      expect(server.plugins.elasticsearch.client.get.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.get.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config'
      }]);
      const defaults = defaultsProvider();
      expect(result).to.eql(defaults.dateFormat.value);
    });

    it(`returns the user-configured value for a custom key`, async function () {
      const getResult = { custom: 'value' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.get('custom');
      expect(server.plugins.elasticsearch.client.get.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.get.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config'
      }]);
      const defaults = defaultsProvider();
      expect(result).to.eql('value');
    });

    it(`returns the user-configured value for a modified key`, async function () {
      const getResult = { dateFormat: 'YYYY-MM-DD' };
      const { server, uiSettings, configGet } = instantiate({ getResult });
      const result = await uiSettings.get('dateFormat');
      expect(server.plugins.elasticsearch.client.get.callCount).to.eql(1);
      expect(server.plugins.elasticsearch.client.get.firstCall.args).to.eql([{
        index: configGet('kibana.index'),
        id: configGet('pkg.version'),
        type: 'config'
      }]);
      const defaults = defaultsProvider();
      expect(result).to.eql('YYYY-MM-DD');
    });
  });
});

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
  return { kbnServer, server, config, uiSettings, esStatus, settingsStatus, configGet };
}
