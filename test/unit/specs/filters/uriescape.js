define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  // Load the kibana app dependencies.
  require('angular-route');
  require('plugins/discover/index');

  var filter;

  var init = function (expandable) {
    // Load the application
    module('kibana');

    // Create the scope
    inject(function ($filter) {
      filter = $filter('uriescape');
    });
  };


  describe('uriescape filter', function () {

    beforeEach(function () {
      init();
    });

    it('should have a uriescape filter', function () {
      expect(filter).to.not.be(null);
    });

    it('should encodeURIComponent a string', function () {
      expect(filter('this and that')).to.be('this%20and%20that');
    });

  });

});
