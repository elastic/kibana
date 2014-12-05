define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var sinon = require('test_utils/auto_release_sinon');

  return ['renderbot', exportWrapper];

  function exportWrapper() {
    var vislib;
    var Vis;
    var Renderbot;
    var VislibRenderbot;
    var normalizeChartData;
    var mockVisType = {
      name: 'test'
    };

    function init() {
      module('kibana');

      inject(function ($injector, Private, _vislib_) {
        vislib = _vislib_;
        Vis = Private(require('components/vislib/vis'));
        Renderbot = Private(require('plugins/vis_types/_renderbot'));
        VislibRenderbot = Private(require('plugins/vis_types/vislib/_vislib_renderbot'));
        normalizeChartData = Private(require('components/agg_response/index'));

      });
    }

    beforeEach(init);

    describe('creation', function () {
      var vis = { type: mockVisType };
      var $el = 'element';
      var createVisStub;
      var renderbot;

      beforeEach(function () {
        createVisStub = sinon.stub(VislibRenderbot.prototype, '_createVis', _.noop);
        renderbot = new VislibRenderbot(vis, $el);
      });

      it('should be a Renderbot', function () {
        expect(renderbot).to.be.a(Renderbot);
      });

      it('should create a new Vis object', function () {
        expect(createVisStub.callCount).to.be(1);
      });
    });

    describe('_createVis', function () {
      var vis = {
        type: mockVisType,
        listeners: {
          'test': _.noop,
          'test2': _.noop,
          'test3': _.noop
        }
      };
      var $el = $('<div>testing</div>');
      var listenerSpy;
      var renderbot;

      beforeEach(function () {
        sinon.stub(VislibRenderbot.prototype, '_getVislibParams', _.constant({}));
        listenerSpy = sinon.spy(vislib.Vis.prototype, 'on');
        renderbot = new VislibRenderbot(vis, $el);
      });

      it('should attach listeners and set vislibVis', function () {
        expect(listenerSpy.callCount).to.be(3);
        expect(listenerSpy.calledWith('test', _.noop)).to.be(true);
        expect(renderbot.vislibVis).to.be.a(Vis);
      });
    });

    describe('param update', function () {
      var params = { one: 'fish', two: 'fish' };
      var vis = {
        type: _.defaults({
          params: {
            defaults: params
          }
        }, mockVisType)
      };
      var $el = 'element';
      var createVisSpy;
      var getParamsStub;
      var renderbot;

      beforeEach(function () {
        createVisSpy = sinon.spy(VislibRenderbot.prototype, '_createVis');
        // getParamsStub = sinon.stub(VislibRenderbot.prototype, '_getVislibParams', _identity);
        // getParamsStub.returns(params);
        renderbot = new VislibRenderbot(vis, $el);
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
      var vis = { type: mockVisType, isHierarchical: _.constant(false) };
      var $el = $('<div>testing</div>');
      var renderbot;
      var stubs = {};

      beforeEach(function () {
        sinon.stub(VislibRenderbot.prototype, '_getVislibParams', _.constant({}));
      });

      it('should use #buildChartData', function () {
        var renderbot = new VislibRenderbot(vis, $el);

        var football = {};
        var buildStub = sinon.stub(renderbot, 'buildChartData', _.constant(football));
        var renderStub = sinon.stub(renderbot.vislibVis, 'render');

        renderbot.render('flat data');
        expect(renderStub.callCount).to.be(1);
        expect(buildStub.callCount).to.be(1);
        expect(renderStub.firstCall.args[0]).to.be(football);
      });
    });

    describe('destroy', function () {
      var vis = {
        type: mockVisType,
        listeners: {
          'test': _.noop,
          'test2': _.noop,
          'test3': _.noop
        }
      };
      var $el = $('<div>testing</div>');
      var listenerSpy;
      var renderbot;

      beforeEach(function () {
        sinon.stub(VislibRenderbot.prototype, '_getVislibParams', _.constant({}));
        listenerSpy = sinon.spy(vislib.Vis.prototype, 'off');
        renderbot = new VislibRenderbot(vis, $el);
      });

      it('should detatch listeners', function () {
        renderbot.destroy();
        expect(listenerSpy.callCount).to.be(3);
        expect(listenerSpy.calledWith('test', _.noop)).to.be(true);
      });

      it('should destroy the vis', function () {
        var spy = sinon.spy(renderbot.vislibVis, 'destroy');
        renderbot.destroy();
        expect(spy.callCount).to.be(1);
      });
    });
  }
});