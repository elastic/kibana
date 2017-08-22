import sinon from 'sinon';
import expect from 'expect.js';
import Chance from 'chance';

import ServerStatus from '../../../server/status/server_status';
import Config from '../../../server/config/config';

/* eslint-disable import/no-duplicates */
import * as uiSettingsServiceFactoryNS from '../ui_settings_service_factory';
import { uiSettingsServiceFactory } from '../ui_settings_service_factory';
import * as getUiSettingsServiceForRequestNS from '../ui_settings_service_for_request';
import { getUiSettingsServiceForRequest } from '../ui_settings_service_for_request';
/* eslint-enable import/no-duplicates */

import { uiSettingsMixin } from '../ui_settings_mixin';

const chance = new Chance();

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
      status: new ServerStatus(server),
      ready: sinon.stub().returns(readyPromise),
    };

    uiSettingsMixin(kbnServer, server, config);

    return {
      kbnServer,
      server,
      decorations,
      readyPromise,
      status: kbnServer.status.get('ui settings'),
    };
  }

  afterEach(() => sandbox.restore());

  describe('status', () => {
    it('creates a "ui settings" status', () => {
      const { status } = setup();
      expect(status).to.have.property('state', 'uninitialized');
    });

    describe('disabled', () => {
      it('disables if uiSettings.enabled config is false', () => {
        const { status } = setup({ enabled: false });
        expect(status).to.have.property('state', 'disabled');
      });

      it('does not register a handler for kbnServer.ready()', () => {
        const { readyPromise } = setup({ enabled: false });
        sinon.assert.notCalled(readyPromise.then);
      });
    });

    describe('enabled', () => {
      it('registers a handler for kbnServer.ready()', () => {
        const { readyPromise } = setup();
        sinon.assert.calledOnce(readyPromise.then);
      });

      it('mirrors the elasticsearch plugin status once kibanaServer.ready() resolves', () => {
        const { kbnServer, readyPromise, status } = setup();
        const esStatus = kbnServer.status.createForPlugin({
          id: 'elasticsearch',
          version: 'kibana',
        });

        esStatus.green();
        expect(status).to.have.property('state', 'uninitialized');
        const readyPromiseHandler = readyPromise.then.firstCall.args[0];
        readyPromiseHandler();
        expect(status).to.have.property('state', 'green');


        const states = chance.shuffle(['red', 'green', 'yellow']);
        states.forEach((state) => {
          esStatus[state]();
          expect(esStatus).to.have.property('state', state);
          expect(status).to.have.property('state', state);
        });
      });
    });
  });

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

    it('defines read interceptor that intercepts when status is not green', () => {
      const { status, decorations } = setup();
      expect(decorations.request).to.have.property('getUiSettingsService').a('function');

      sandbox.stub(getUiSettingsServiceForRequestNS, 'getUiSettingsServiceForRequest');
      decorations.request.getUiSettingsService();

      const options = getUiSettingsServiceForRequest.firstCall.args[2];
      expect(options).to.have.property('readInterceptor');

      const { readInterceptor } = options;
      expect(readInterceptor).to.be.a('function');

      status.green();
      expect(readInterceptor()).to.be(undefined);

      status.yellow();
      expect(readInterceptor()).to.eql({});

      status.red();
      expect(readInterceptor()).to.eql({});

      status.green();
      expect(readInterceptor()).to.eql(undefined);
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
