define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var faker = require('faker');

  // Load the kibana app dependencies.
  require('angular-route');

  // Load kibana and its applications
  require('plugins/discover/index');

  var filter;

  var init = function (expandable) {
    // Load the application
    module('kibana');

    // Create the scope
    inject(function ($filter) {
      filter = $filter('label');
    });
  };

  describe('label filter', function () {
    beforeEach(function () {
      init();
    });

    it('should have a label filter', function () {
      expect(filter).to.not.be(null);
    });

    it('should capitalize the first letter in a string', function () {
      expect(filter('something')).to.be('Something');
    });

    it('should capitalize the first letter in every word', function () {
      expect(filter('foo bar fizz buzz')).to.be('Foo Bar Fizz Buzz');
    });
  });

});
