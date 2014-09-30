define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
  require('components/state_management/app_state');

  describe('State Management', function () {
    var $rootScope, AppState;

    beforeEach(function () {
      module('kibana');

      inject(function (_$rootScope_, _$location_, Private) {
        $rootScope = _$rootScope_;
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

      it('should be destroyed on $routeChangeStart', function () {
        var destroySpy = sinon.spy(appState, 'destroy');
        var url = '/test/path';

        $rootScope.$emit('$routeChangeStart');

        expect(destroySpy.callCount).to.be(1);
      });

      it('should use passed in params');
    });
  });
});
