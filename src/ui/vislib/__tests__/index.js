define(function (require) {
  var _ = require('lodash');
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  var angular = require('angular');

  angular.module('kibana/vislib', ['kibana']);

  describe('VisLib Index Test Suite', function () {
    var visLib;

    beforeEach(function () {
      ngMock.module('kibana/vislib');
    });

    beforeEach(function () {
      ngMock.inject(function (d3, vislib) {
        visLib = vislib;
      });
    });

    it('should return an object', function () {
      expect(_.isObject(visLib)).to.be(true);
    });

    it('should return a Vis function', function () {
      expect(_.isFunction(visLib.Vis)).to.be(true);
    });
  });
});
