define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');

  require('components/url/url');

  function init() {
    module('kibana/url', function ($provide) {
      // mock storage service
      $provide.service('$route', function () {
      });
    });

    inject(function ($injector) {
    });
  }

  describe('kbnUrl', function () {
    beforeEach(function () {
      init();
    });

    describe('change', function () {
      it('should change the url');
      it('should allow forceReload as the 2nd param');
      it('should replace template params');
      it('should rison encode template parameters');
      it('should throw when params are missing');
    });

    describe('change reloading', function () {
      it('should reload on new url');
      it('should reload when forceReload is true');
      it('should not reload when url is the same');
      it('should not reload when another reload is running');
    });

    describe('match', function () {
      it('should return null if no route is set');
      it('should return true when matching route');
      it('should return false when not matching route');
    });
  });
});