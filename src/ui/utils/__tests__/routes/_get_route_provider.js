define(function (require) {
  var angular = require('angular');
  var ngMock = require('ngMock');
  var sinon = require('auto-release-sinon/mocha');

  /**
   * Wrap a test function with the logic required to get the routeProvider
   * @param  {Function} fn [description]
   * @return {[type]}      [description]
   */
  return function getRouteProvider() {
    var $routeProvider;

    angular.module('_Temp_Module_', ['ngRoute'])
    .config(['$routeProvider', function (_r) {
      $routeProvider = _r;
    }]);

    ngMock.module('_Temp_Module_');
    ngMock.inject(function () {});

    sinon.stub($routeProvider, 'otherwise');
    sinon.stub($routeProvider, 'when');

    return $routeProvider;
  };
});
