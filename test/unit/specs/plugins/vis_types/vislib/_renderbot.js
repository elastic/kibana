define(function (require) {
  return ['renderbot', exportWrapper];

  function exportWrapper() {
    var vislib;

    function init() {
      // module('kibana', function ($provide) {
      // });
      module('kibana');

      inject(function ($injector) {
        vislib = $injector.get('vislib');
      });
    }

    describe('creation', function () {
      it('should create a new Vis object');
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