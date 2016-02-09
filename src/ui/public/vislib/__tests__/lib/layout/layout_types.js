import angular from 'angular';
import _ from 'lodash';
import ngMock from 'ngMock';
import expect from 'expect.js';
import VislibLibLayoutLayoutTypesProvider from 'ui/vislib/lib/layout/layout_types';

describe('Vislib Layout Types Test Suite', function () {
  var layoutType;
  var layoutFunc;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    layoutType = Private(VislibLibLayoutLayoutTypesProvider);
    layoutFunc = layoutType.histogram;
  }));

  it('should be an object', function () {
    expect(_.isObject(layoutType)).to.be(true);
  });

  it('should return a function', function () {
    expect(typeof layoutFunc).to.be('function');
  });
});
