
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ngMock';
import d3 from 'd3';

import angular from 'angular';
import 'ui/vislib/styles/main.less';

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
