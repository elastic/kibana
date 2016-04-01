let angular = require('angular');
let _ = require('lodash');
let ngMock = require('ngMock');
let expect = require('expect.js');

describe('Vislib Layout Types Test Suite', function () {
  let layoutType;
  let layoutFunc;

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
