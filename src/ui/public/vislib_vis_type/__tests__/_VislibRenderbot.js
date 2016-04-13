describe('renderbot', function exportWrapper() {
  let _ = require('lodash');
  let $ = require('jquery');
  let ngMock = require('ngMock');
  let expect = require('expect.js');
  let sinon = require('auto-release-sinon');
  let vislib;
  let Vis;
  let Renderbot;
  let VislibRenderbot;
  let persistedState;
  let normalizeChartData;
  let mockVisType = {
    name: 'test'
  };

  function init() {
    ngMock.module('kibana');

    ngMock.inject(function ($injector, Private) {
      vislib = Private(require('ui/vislib'));
      Vis = Private(require('ui/vislib/vis'));
      Renderbot = Private(require('ui/Vis/Renderbot'));
      VislibRenderbot = Private(require('ui/vislib_vis_type/VislibRenderbot'));
      persistedState = new (Private(require('ui/persisted_state/persisted_state')))();
      normalizeChartData = Private(require('ui/agg_response/index'));
    });
  }

  beforeEach(init);

  describe('creation', function () {
    let vis = { type: mockVisType };
    let $el = 'element';
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
    let vis = {
      type: mockVisType,
      listeners: {
        'test': _.noop,
        'test2': _.noop,
        'test3': _.noop
      }
    };
    let $el = $('<div>testing</div>');
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
    let params = { one: 'fish', two: 'fish' };
    let vis = {
      type: _.defaults({
        params: {
          defaults: params
        }
      }, mockVisType)
    };
    let $el = $('<div>testing</div>');
    let createVisSpy;
    let getParamsStub;
    let renderbot;

    beforeEach(function () {
      createVisSpy = sinon.spy(VislibRenderbot.prototype, '_createVis');
      // getParamsStub = sinon.stub(VislibRenderbot.prototype, '_getVislibParams', _identity);
      // getParamsStub.returns(params);
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
    let vis = { type: mockVisType, isHierarchical: _.constant(false) };
    let $el = $('<div>testing</div>');
    let stubs = {};

    beforeEach(function () {
      sinon.stub(VislibRenderbot.prototype, '_getVislibParams', _.constant({}));
    });

    it('should use #buildChartData', function () {
      let renderbot = new VislibRenderbot(vis, $el, persistedState);

      let football = {};
      let buildStub = sinon.stub(renderbot, 'buildChartData', _.constant(football));
      let renderStub = sinon.stub(renderbot.vislibVis, 'render');

      renderbot.render('flat data', persistedState);
      expect(renderStub.callCount).to.be(1);
      expect(buildStub.callCount).to.be(1);
      expect(renderStub.firstCall.args[0]).to.be(football);
    });
  });

  describe('destroy', function () {
    let vis = {
      type: mockVisType,
      listeners: {
        'test': _.noop,
        'test2': _.noop,
        'test3': _.noop
      }
    };
    let $el = $('<div>testing</div>');
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
      let spy = sinon.spy(renderbot.vislibVis, 'destroy');
      renderbot.destroy();
      expect(spy.callCount).to.be(1);
    });
  });
});
