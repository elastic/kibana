
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/vislib/styles/main.less';
import VislibProvider from 'ui/vislib';

describe('Vislib Index Test Suite', function () {
  let vislib;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    vislib = Private(VislibProvider);
  }));

  it('should return an object', function () {
    expect(_.isObject(vislib)).to.be(true);
  });

  it('should return a Vis function', function () {
    expect(_.isFunction(vislib.Vis)).to.be(true);
  });
});
