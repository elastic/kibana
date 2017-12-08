import sinon from 'sinon';
import expect from 'expect.js';

import { Config } from '../../../server/config';

/* eslint-disable import/no-duplicates */
import * as uiSettingsServiceFactoryNS from '../ui_settings_service_factory';
import { uiSettingsServiceFactory } from '../ui_settings_service_factory';
import * as getUiSettingsServiceForRequestNS from '../ui_settings_service_for_request';
import { getUiSettingsServiceForRequest } from '../ui_settings_service_for_request';
/* eslint-enable import/no-duplicates */

import { uiSettingsMixin } from '../ui_settings_mixin';

describe('uiSettingsMixin()', () => {
  const sandbox = sinon.sandbox.create();

  function setup(options = {}) {
    const {
      enabled = true
    } = options;

    const config = Config.withDefaultSchema({
      uiSettings: { enabled }
    });

    // maps of decorations passed to `server.decorate()`
    const decorations = {
      server: {},
      request: {}
    };

    // mock hapi server
    const server = {
      log: sinon.stub(),
      route: sinon.stub(),
      config: () => config,
      addMemoizedFactoryToRequest(name, factory) {
        this.decorate('request', name, function () {
          return factory(this);
        });
      },
      decorate: sinon.spy((type, name, value) => {
        decorations[type][name] = value;
      }),
    };

    // "promise" returned from kbnServer.ready()
    const readyPromise = {
      then: sinon.stub(),
    };

    const kbnServer = {
      server,
      config,
      uiExports: { addConsumer: sinon.stub() },
      ready: sinon.stub().returns(readyPromise),
    };

    uiSettingsMixin(kbnServer, server, config);

    return {
      kbnServer,
      server,
      decorations,
      readyPromise,
    };
  }

  afterEach(() => sandbox.restore());

  describe('server.uiSettingsServiceFactory()', () => {
    it('decorates server with "uiSettingsServiceFactory"', () => {
      const { decorations } = setup();
      expect(decorations.server).to.have.property('uiSettingsServiceFactory').a('function');

      sandbox.stub(uiSettingsServiceFactoryNS, 'uiSettingsServiceFactory');
      sinon.assert.notCalled(uiSettingsServiceFactory);
      decorations.server.uiSettingsServiceFactory();
      sinon.assert.calledOnce(uiSettingsServiceFactory);
    });

    it('passes `server` and `options` argument to factory', () => {
      const { decorations, server } = setup();
      expect(decorations.server).to.have.property('uiSettingsServiceFactory').a('function');

      sandbox.stub(uiSettingsServiceFactoryNS, 'uiSettingsServiceFactory');
      sinon.assert.notCalled(uiSettingsServiceFactory);
      decorations.server.uiSettingsServiceFactory({
        foo: 'bar'
      });
      sinon.assert.calledOnce(uiSettingsServiceFactory);
      sinon.assert.calledWithExactly(uiSettingsServiceFactory, server, {
        foo: 'bar',
        getDefaults: sinon.match.func,
      });
    });
  });

  describe('request.getUiSettingsService()', () => {
    it('exposes "getUiSettingsService" on requests', () => {
      const { decorations } = setup();
      expect(decorations.request).to.have.property('getUiSettingsService').a('function');

      sandbox.stub(getUiSettingsServiceForRequestNS, 'getUiSettingsServiceForRequest');
      sinon.assert.notCalled(getUiSettingsServiceForRequest);
      decorations.request.getUiSettingsService();
      sinon.assert.calledOnce(getUiSettingsServiceForRequest);
    });

    it('passes request to getUiSettingsServiceForRequest', () => {
      const { server, decorations } = setup();
      expect(decorations.request).to.have.property('getUiSettingsService').a('function');

      sandbox.stub(getUiSettingsServiceForRequestNS, 'getUiSettingsServiceForRequest');
      sinon.assert.notCalled(getUiSettingsServiceForRequest);
      const request = {};
      decorations.request.getUiSettingsService.call(request);
      sinon.assert.calledWith(getUiSettingsServiceForRequest, server, request);
    });
  });

  describe('server.uiSettings()', () => {
    it('throws an error, links to pr', () => {
      const { decorations } = setup();
      expect(decorations.server).to.have.property('uiSettings').a('function');
      expect(() => {
        decorations.server.uiSettings();
      }).to.throwError('http://github.com');
    });
  });
});
