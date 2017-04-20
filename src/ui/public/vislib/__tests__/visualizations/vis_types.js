import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';
import { VislibVisualizationsVisTypesProvider } from 'ui/vislib/visualizations/vis_types';

describe('Vislib Vis Types Test Suite', function () {
  let visTypes;
  let visFunc;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    visTypes = Private(VislibVisualizationsVisTypesProvider);
    visFunc = visTypes.point_series;
  }));

  it('should be an object', function () {
    expect(_.isObject(visTypes)).to.be(true);
  });

  it('should return a function', function () {
    expect(typeof visFunc).to.be('function');
  });
});
