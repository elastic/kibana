define(function (require) {
  var $ = require('jquery');
  var sinon = require('test_utils/auto_release_sinon');

  return ['renderbot', exportWrapper];

  function exportWrapper() {
    var vislib;
    var Renderbot;
    var VislibRenderbot;

    function init() {
      module('kibana');

      inject(function ($injector, Private) {
        vislib = $injector.get('vislib');
        Renderbot = Private(require('plugins/vis_types/_renderbot'));
        VislibRenderbot = Private(require('plugins/vis_types/vislib/_vislib_renderbot'));
      });
    }

    describe('creation', function () {
      var vis;
      var $el;
      var createVisStub;
      var renderbot;

      beforeEach(init);

      beforeEach(function () {
        vis = { type: 'vis' };
        $el = 'element';
        createVisStub = sinon.stub(VislibRenderbot.prototype, '_createVis');
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
      it('should attach listeners');
    });

    describe('param update', function () {
      it('should create a new Vis object if params change');
      it('should not create a new Vis object if params are the same');
    });

    describe('render', function () {
      it('should normalize chart data via flatten');
      it('should normalize chart data via hierarchical');
      it('should render the vis');
    });

    describe('destroy', function () {
      it('should detatch listeners');
      it('should destroy the vis');
    });
  }
});