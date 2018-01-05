import expect from 'expect.js';
import * as geoPolygon from '../geo_polygon';
import { nodeTypes } from '../../node_types';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';

let indexPattern;
const points = [
  {
    lat: 69.77,
    lon: -171.56
  },
  {
    lat: 50.06,
    lon: -169.10
  },
  {
    lat: 69.16,
    lon: -125.85
  }
];

describe('kuery functions', function () {

  describe('geoPolygon', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
    }));

    describe('buildNodeParams', function () {

      it('should return an "arguments" param', function () {
        const result = geoPolygon.buildNodeParams('geo', points);
        expect(result).to.only.have.keys('arguments');
      });

      it('arguments should contain the provided fieldName as a literal', function () {
        const result = geoPolygon.buildNodeParams('geo', points);
        const { arguments: [ fieldName ] } = result;

        expect(fieldName).to.have.property('type', 'literal');
        expect(fieldName).to.have.property('value', 'geo');
      });

      it('arguments should contain the provided points literal "lat, lon" string values', function () {
        const result = geoPolygon.buildNodeParams('geo', points);
        const { arguments: [ , ...args ] } = result;

        args.forEach((param, index) => {
          expect(param).to.have.property('type', 'literal');
          const expectedPoint = points[index];
          const expectedLatLon = `${expectedPoint.lat}, ${expectedPoint.lon}`;
          expect(param.value).to.be(expectedLatLon);
        });
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should return an ES geo_polygon query representing the given node', function () {
        const node = nodeTypes.function.buildNode('geoPolygon', 'geo', points);
        const result = geoPolygon.toElasticsearchQuery(node, indexPattern);
        expect(result).to.have.property('geo_polygon');
        expect(result.geo_polygon.geo).to.have.property('points');

        result.geo_polygon.geo.points.forEach((point, index) => {
          const expectedLatLon = `${points[index].lat}, ${points[index].lon}`;
          expect(point).to.be(expectedLatLon);
        });
      });


      it('should use the ignore_unmapped parameter', function () {
        const node = nodeTypes.function.buildNode('geoPolygon', 'geo', points);
        const result = geoPolygon.toElasticsearchQuery(node, indexPattern);
        expect(result.geo_polygon.ignore_unmapped).to.be(true);
      });

      it('should throw an error for scripted fields', function () {
        const node = nodeTypes.function.buildNode('geoPolygon', 'script number', points);
        expect(geoPolygon.toElasticsearchQuery)
          .withArgs(node, indexPattern).to.throwException(/Geo polygon query does not support scripted fields/);
      });
    });
  });
});
