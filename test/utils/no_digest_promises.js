define(['angular', 'bluebird', 'services/promises'], function (angular, Bluebird) {
  /**
   * replace the Promise service with Bluebird so that tests
   * can use promises without having to call $rootScope.apply()
   *
   * var nonDigestPromises = require('test_utils/non_digest_promises');
   *
   * describe('some module that does complex shit with promises', function () {
   *   beforeEach(nonDigestPromises.activate);
   *
   * });
   */

  var active = false;

  angular.module('kibana')
  .config(function ($provide) {
    $provide.decorator('Promise', function ($delegate) {
      return active ? Bluebird : $delegate;
    });
  });

  function activate() { active = true; }
  function deactivate() { active = false; }

  return {
    activate: activate,
    deactivate: deactivate,
    activateForSuite: function () {
      before(activate);
      after(deactivate);
    }
  };
});