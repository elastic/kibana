import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import IndexPatternsCastMappingTypeProvider from 'ui/index_patterns/_cast_mapping_type';
describe('type normalizer (castMappingType)', function () {
  let fn;
  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fn = Private(IndexPatternsCastMappingTypeProvider);
  }));

  it('should be a function', function () {
    expect(fn).to.be.a(Function);
  });

  it('should have a types property', function () {
    expect(fn).to.have.property('types');
  });

  it('should cast numeric types to "number"', function () {
    const types = [
      'float',
      'double',
      'integer',
      'long',
      'short',
      'byte',
      'token_count'
    ];

    _.each(types, function (type) {
      expect(fn(type)).to.be('number');
    });
  });

  it('should treat non-numeric known types as what they are', function () {
    const types = [
      'date',
      'boolean',
      'ip',
      'attachment',
      'geo_point',
      'geo_shape',
      'murmur3',
      'string'
    ];

    _.each(types, function (type) {
      expect(fn(type)).to.be(type);
    });
  });

  it('should cast text and keyword types to "string"', function () {
    const types = [
      'keyword',
      'text'
    ];

    _.each(types, function (type) {
      expect(fn(type)).to.be('string');
    });
  });

  it('should treat everything else as a string', function () {
    expect(fn('fooTypeIsNotReal')).to.be('string');
  });
});
