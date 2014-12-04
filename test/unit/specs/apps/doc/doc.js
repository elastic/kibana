define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');

  // Load the kibana app dependencies.
  require('angular-route');

  require('plugins/doc/index');

  var $scope, createController, $route;

  var init = function (index, type, id) {

    module('kibana');

    // Stub services
    module(function ($provide) {
      $provide.service('$route', function (Private) {
        this.current = {
          locals: {
            indexPattern: Private(require('fixtures/stubbed_logstash_index_pattern'))
          },
          params: {
            index: index || 'myIndex',
            type: type || 'myType',
            id: id || 'myId'
          }
        };
      });
    });

    // Create the scope
    inject(function ($rootScope, $controller, _$route_) {

      $route = _$route_;
      $scope = $rootScope.$new();

      createController = function () {
        return $controller('doc', {
          '$scope': $scope
        });
      };
    });
  };


  describe('Doc app controller', function () {

    beforeEach(function () {
      init();
    });

    it('should have $scope.foo', function () {
      createController();
    });

  });

});
