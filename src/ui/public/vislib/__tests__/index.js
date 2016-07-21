
var _ = require('lodash');
var expect = require('expect.js');
var ngMock = require('ngMock');
var d3 = require('d3');
require('ui/vislib/styles/main.less');

var angular = require('angular');

describe('Vislib Index Test Suite', function () {
  var vislib;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    vislib = Private(require('ui/vislib'));
  }));

  it('should return an object', function () {
    expect(_.isObject(vislib)).to.be(true);
  });

  it('should return a Vis function', function () {
    expect(_.isFunction(vislib.Vis)).to.be(true);
  });
});
