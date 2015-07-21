define(function (require) {
  var angular = require('angular');
  var expect = require('expect.js');
  var ngMock = require('ngMock');
  var _ = require('lodash');

  angular.module('VisTypeFactory', ['kibana']);

  describe('Vislib Vis Types Test Suite', function () {
    var visTypes;
    var visFunc;

    beforeEach(function () {
      ngMock.module('VisTypeFactory');
    });

    beforeEach(function () {
      ngMock.inject(function (d3, Private) {
        visTypes = Private(require('ui/vislib/visualizations/vis_types'));
        visFunc = visTypes.histogram;
      });
    });

    it('should be an object', function () {
      expect(_.isObject(visTypes)).to.be(true);
    });

    it('should return a function', function () {
      expect(typeof visFunc).to.be('function');
    });
  });

});
