var angular = require('angular');
var _ = require('lodash');
var ngMock = require('ngMock');
var expect = require('expect.js');

describe('Vislib Layout Types Test Suite', function () {
  var layoutType;
  var layoutFunc;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    layoutType = Private(require('ui/vislib/lib/layout/layout_types'));
    layoutFunc = layoutType.histogram;
  }));

  it('should be an object', function () {
    expect(_.isObject(layoutType)).to.be(true);
  });

  it('should return a function', function () {
    expect(typeof layoutFunc).to.be('function');
  });
});
