define(function (require) {
  return ['Field Formatters', function () {
    var _ = require('lodash');
    var moment = require('moment');

    var _config;
    var formatters;
    var formatter;
    var types = [
      'number',
      'boolean',
      'date',
      'ip',
      'attachment',
      'geo_point',
      'geo_shape',
      'string',
      'conflict'
    ];

    function formatFn(typeOrName) {
      return (formatters.byName[typeOrName] || formatters.defaultByType[typeOrName]).convert;
    }

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector, config) {
      _config = config;
      formatters = Private(require('components/index_patterns/_field_formats'));
    }));

    it('should be an Object', function () {
      expect(formatters).to.be.an(Object);
    });

    it('should have formatters indexed by type and by name', function () {
      expect(formatters.byType).to.be.an(Object);
      expect(formatters.byName).to.be.an(Object);
    });

    it('should have 1 or more formatters for each of ' + types.join(','), function () {
      _.each(types, function (type) {
        expect(formatters.byType[type]).to.be.an(Array);
        _.each(formatters.byType[type], function (formatter) {
          expect(formatter.convert).to.be.a(Function);
        });
      });
    });

    it('should expose default formatters for each type', function () {
      _.each(types, function (type) {
        expect(formatters.defaultByType[type]).to.be.an(Object);
      });
    });

    describe('Array handling', function () {

      it('should unwrap single item arrays', function () {
        formatter = formatFn('string');
        expect(formatter(['foo'])).to.not.be.an(Array);
        expect(formatter(['foo'])).to.be('foo');
      });

      it('should stringify arrays longer than 1 element', function () {
        formatter = formatFn('ip');
        expect(formatter([0, 2130706433])).to.not.be.an(Array);
        expect(formatter([0, 2130706433])).to.be('["0.0.0.0","127.0.0.1"]');
      });
    });


    describe('string formatter', function () {

      beforeEach(function () {
        formatter = formatFn('string');
      });

      it('should the string value of the field', function () {
        expect(formatter('foo')).to.be('foo');
        expect(formatter(5)).to.be('5');
      });

      it('should return JSON for objects', function () {
        expect(formatter({foo: true})).to.be('{"foo":true}');
      });

      it('should return an empty string for null', function () {
        expect(formatter(null)).to.be('');
      });

    });

    describe('date formatter', function () {

      var dateFormat = 'YYYY-MM-DD';
      beforeEach(function () {
        _config.set('dateFormat', dateFormat);
        formatter = formatFn('date');
      });

      it('should format numbers', function () {
        expect(formatter(0)).to.be(moment(0).format(dateFormat));
      });

      it('should format dates', function () {
        expect(formatter(new Date(0))).to.be(moment(0).format(dateFormat));
      });

      it('should not format strings', function () {
        expect(formatter('2014-11')).to.be('2014-11');
      });

    });


    describe('ip formatter', function () {

      beforeEach(function () {
        formatter = formatFn('ip');
      });

      it('should format numbers', function () {
        expect(formatter(2130706433)).to.be('127.0.0.1');
      });

      it('should coerce numbers that are strings', function () {
        expect(formatter('2130706433')).to.be('127.0.0.1');
      });

      it('should not coerce strings that are not numbers', function () {
        expect(formatter('foo')).to.be('foo');
      });

    });

    describe('kilobyte formatter', function () {
      beforeEach(function () {
        formatter = formatFn('kilobytes');
      });

      it('should be a function', function () {
        expect(formatter).to.be.a(Function);
      });

      it('should format a number as kilobytes', function () {
        expect(formatter(1024)).to.be('1.000 kb');
      });
    });

  }];
});