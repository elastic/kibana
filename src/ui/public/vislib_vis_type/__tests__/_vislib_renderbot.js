import _ from 'lodash';
import $ from 'jquery';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';
import VislibProvider from 'ui/vislib';
import { VislibVisProvider } from 'ui/vislib/vis';
import { VisRenderbotProvider } from 'ui/vis/renderbot';
import VislibVisTypeVislibRenderbotProvider from 'ui/vislib_vis_type/vislib_renderbot';
import 'ui/persisted_state';
import noDigestPromises from 'test_utils/no_digest_promises';

describe('renderbot', function exportWrapper() {
  let vislib;
  let Vis;
  let Renderbot;
  let VislibRenderbot;
  let persistedState;
  const mockVisType = {
    name: 'test'
  };

  function init() {
    ngMock.module('kibana');

    ngMock.inject(function ($injector, Private) {
      vislib = Private(VislibProvider);
      Vis = Private(VislibVisProvider);
      Renderbot = Private(VisRenderbotProvider);
      VislibRenderbot = Private(VislibVisTypeVislibRenderbotProvider);
      persistedState = new ($injector.get('PersistedState'))();
    });
  }

  beforeEach(init);

  describe('creation', function () {
    const vis = { type: mockVisType };
    const $el = 'element';
    let createVisStub;
    let renderbot;

    beforeEach(function () {
      createVisStub = sinon.stub(VislibRenderbot.prototype, '_createVis', _.noop);
      renderbot = new VislibRenderbot(vis, $el, persistedState);
    });

    it('should be a Renderbot', function () {
      expect(renderbot).to.be.a(Renderbot);
    });

    it('should create a new Vis object', function () {
      expect(createVisStub.callCount).to.be(1);
    });
  });

  describe('_createVis', function () {
    const vis = {
      type: mockVisType,
      listeners: {
        'test': _.noop,
        'test2': _.noop,
        'test3': _.noop
      }
    };
    const $el = $('<div>testing</div>');
    let listenerSpy;
    let renderbot;

    beforeEach(function () {
      sinon.stub(VislibRenderbot.prototype, '_getVislibParams', _.constant({}));
      listenerSpy = sinon.spy(vislib.Vis.prototype, 'on');
      renderbot = new VislibRenderbot(vis, $el, persistedState);
    });

    it('should attach listeners and set vislibVis', function () {
      expect(listenerSpy.callCount).to.be(3);
      expect(listenerSpy.calledWith('test', _.noop)).to.be(true);
      expect(renderbot.vislibVis).to.be.a(Vis);
    });
  });

  describe('param update', function () {
    const $el = $('<div>testing</div>');
    const params = { el: $el[0], one: 'fish', two: 'fish' };
    const vis = {
      type: _.defaults({
        params: {
          defaults: params
        }
      }, mockVisType)
    };
    let createVisSpy;
    let renderbot;

    beforeEach(function () {
      createVisSpy = sinon.spy(VislibRenderbot.prototype, '_createVis');
      renderbot = new VislibRenderbot(vis, $el, persistedState);
    });

    it('should create a new Vis object when params change', function () {
      // called on init
      expect(createVisSpy.callCount).to.be(1);
      renderbot.updateParams(_.clone(params));
      // not called again, same params
      expect(createVisSpy.callCount).to.be(1);
      renderbot.vis.params = { one: 'fishy', two: 'fishy' };
      renderbot.updateParams();
      // called again, new params
      expect(createVisSpy.callCount).to.be(2);
      renderbot.updateParams();
      // same params again, no new call
      expect(createVisSpy.callCount).to.be(2);
    });
  });

  describe('render', function () {
    noDigestPromises.activateForSuite();

    const vis = { type: mockVisType, isHierarchical: _.constant(false) };
    const $el = $('<div>testing</div>');

    beforeEach(function () {
      sinon.stub(VislibRenderbot.prototype, '_getVislibParams', _.constant({}));
    });

    it('should use #buildChartData', function () {
      const renderbot = new VislibRenderbot(vis, $el, persistedState);

      const football = {};
      const buildStub = sinon.stub(renderbot, 'buildChartData', _.constant(football));
      const renderStub = sinon.stub(renderbot.vislibVis, 'render');

      return renderbot.render('flat data', persistedState).then(() => {
        expect(renderStub.callCount).to.be(1);
        expect(buildStub.callCount).to.be(1);
        expect(renderStub.firstCall.args[0]).to.be(football);
      });
    });
  });

  describe('destroy', function () {
    const vis = {
      type: mockVisType,
      listeners: {
        'test': _.noop,
        'test2': _.noop,
        'test3': _.noop
      }
    };
    const $el = $('<div>testing</div>');
    let listenerSpy;
    let renderbot;

    beforeEach(function () {
      sinon.stub(VislibRenderbot.prototype, '_getVislibParams', _.constant({}));
      listenerSpy = sinon.spy(vislib.Vis.prototype, 'off');
      renderbot = new VislibRenderbot(vis, $el, persistedState);
    });

    it('should detatch listeners', function () {
      renderbot.destroy();
      expect(listenerSpy.callCount).to.be(3);
      expect(listenerSpy.calledWith('test', _.noop)).to.be(true);
    });

    it('should destroy the vis', function () {
      const spy = sinon.spy(renderbot.vislibVis, 'destroy');
      renderbot.destroy();
      expect(spy.callCount).to.be(1);
    });
  });
});
