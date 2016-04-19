import sinon from 'auto-release-sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/state_management/app_state';
import StateManagementAppStateProvider from 'ui/state_management/app_state';

describe('State Management', function () {
  let $rootScope;
  let AppState;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$rootScope_, _$location_, Private) {
    $rootScope = _$rootScope_;
    AppState = Private(StateManagementAppStateProvider);
  }));

  describe('App State', function () {
    let appState;

    beforeEach(function () {
      appState = new AppState();
    });

    it('should have _urlParam of _a', function () {
      expect(appState).to.have.property('_urlParam');
      expect(appState._urlParam).to.equal('_a');
    });

    it('should use passed in params', function () {
      let params = {
        test: true,
        mock: false
      };

      appState = new AppState(params);
      expect(appState).to.have.property('_defaults');

      Object.keys(params).forEach(function (key) {
        expect(appState._defaults).to.have.property(key);
        expect(appState._defaults[key]).to.equal(params[key]);
      });
    });

    it('should have a destroy method', function () {
      expect(appState).to.have.property('destroy');
    });

    it('should be destroyed on $routeChangeStart', function () {
      let destroySpy = sinon.spy(appState, 'destroy');
      let url = '/test/path';

      $rootScope.$emit('$routeChangeStart');

      expect(destroySpy.callCount).to.be(1);
    });
  });
});
