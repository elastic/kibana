define(function (require) {
  var angular = require('angular');
  var sinon = require('test_utils/auto_release_sinon');

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

    module('_Temp_Module_');
    inject(function () {});

    sinon.stub($routeProvider, 'otherwise');
    sinon.stub($routeProvider, 'when');

    return $routeProvider;
  };
});