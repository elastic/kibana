import expect from 'expect.js';
import * as geoBoundingBox from '../geo_bounding_box';
import { nodeTypes } from '../../node_types';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';

let indexPattern;
const params = {
  bottomRight: {
    lat: 50.73,
    lon: -135.35
  },
  topLeft: {
    lat: 73.12,
    lon: -174.37
  }
};

describe('kuery functions', function () {

  describe('geoBoundingBox', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
    }));

    describe('buildNodeParams', function () {

      it('should return an "arguments" param', function () {
        const result = geoBoundingBox.buildNodeParams('geo', params);
        expect(result).to.only.have.keys('arguments');
      });

      it('arguments should contain the provided fieldName as a literal', function () {
        const result = geoBoundingBox.buildNodeParams('geo', params);
        const { arguments: [ fieldName ] } = result;

        expect(fieldName).to.have.property('type', 'literal');
        expect(fieldName).to.have.property('value', 'geo');
      });

      it('arguments should contain the provided params as named arguments with "lat, lon" string values', function () {
        const result = geoBoundingBox.buildNodeParams('geo', params);
        const { arguments: [ , ...args ] } = result;

        args.map((param) => {
          expect(param).to.have.property('type', 'namedArg');
          expect(['bottomRight', 'topLeft'].includes(param.name)).to.be(true);
          expect(param.value.type).to.be('literal');

          const expectedParam = params[param.name];
          const expectedLatLon = `${expectedParam.lat}, ${expectedParam.lon}`;
          expect(param.value.value).to.be(expectedLatLon);
        });
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should return an ES geo_bounding_box query representing the given node', function () {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'geo', params);
        const result = geoBoundingBox.toElasticsearchQuery(node, indexPattern);
        expect(result).to.have.property('geo_bounding_box');
        expect(result.geo_bounding_box.geo).to.have.property('top_left', '73.12, -174.37');
        expect(result.geo_bounding_box.geo).to.have.property('bottom_right', '50.73, -135.35');
      });

      it('should use the ignore_unmapped parameter', function () {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'geo', params);
        const result = geoBoundingBox.toElasticsearchQuery(node, indexPattern);
        expect(result.geo_bounding_box.ignore_unmapped).to.be(true);
      });

      it('should throw an error for scripted fields', function () {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'script number', params);
        expect(geoBoundingBox.toElasticsearchQuery)
          .withArgs(node, indexPattern).to.throwException(/Geo bounding box query does not support scripted fields/);
      });
    });
  });
});
