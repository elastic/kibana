define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
  require('components/state_management/app_state');

  describe('State Management', function () {
    var $rootScope, $location, AppState;

    beforeEach(function () {
      module('kibana');

      inject(function (_$location_, Private) {
        $location = _$location_;
        AppState = Private(require('components/state_management/app_state'));
      });
    });

    describe('App State', function () {
      var appState;

      beforeEach(function () {
        appState = new AppState();
      });

      it('should have a destroy method', function () {
        expect(appState).to.have.property('destroy');
      });

      it('should use passed in params');

      it('should be destroyed on route change');
    });
  });
});
