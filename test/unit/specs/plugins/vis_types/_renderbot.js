define(function (require) {
  var Renderbot;

  return ['renderbot', exportWrapper];

  function exportWrapper() {
    function init() {
      module('kibana');

      inject(function (Private) {
        Renderbot = Private(require('plugins/vis_types/_renderbot'));
      });
    }

    describe('API', function () {
      var vis;
      var $el;
      var renderbot;

      beforeEach(init);
      beforeEach(function () {
        vis = { hello: 'world' };
        $el = 'element';
        renderbot = new Renderbot(vis, $el);
      });

      it('should have expected methods', function () {
        expect(renderbot).to.have.property('render');
        expect(renderbot).to.have.property('destroy');
        expect(renderbot).to.have.property('updateParams');
      });

      it('should throw if not implemented', function () {
        expect(renderbot.render).to.throwError();
        expect(renderbot.destroy).to.throwError();
      });
    });
  }
});