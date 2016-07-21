describe('type normalizer (castMappingType)', function () {
  var _ = require('lodash');
  var ngMock = require('ngMock');
  var expect = require('expect.js');

  var fn;
  var fields;
  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    fn = Private(require('ui/index_patterns/_cast_mapping_type'));
  }));

  it('should be a function', function () {
    expect(fn).to.be.a(Function);
  });

  it('should have a types property', function () {
    expect(fn).to.have.property('types');
  });

  it('should cast numeric types to "number"', function () {
    var types = [
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
    var types = [
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

  it('should treat everything else as a string', function () {
    expect(fn('fooTypeIsNotReal')).to.be('string');
  });

});
