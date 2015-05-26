define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  angular.module('ValidateVisDataFactory', ['kibana']);

  describe('Vislib ValidateVisData Test Suite', function () {
    function generateData(length, size, type) {
      function generateValues(size, type) {
        return Array.apply(null, new Array(size))
        .map(function () {
          if (type === 'pie') {
            return {
              size: +(Math.random() * 100).toFixed(0)
            };
          }

          return {
            x: +(Math.random() * 100).toFixed(0),
            y: +(Math.random() * 100).toFixed(0)
          };
        });
      }

      return {
        rows: Array.apply(null, new Array(length))
        .map(function () {
          if (type === 'pie') {
            return {
              slices: {
                children: generateValues(size, type)
              }
            };
          }

          return { series: generateValues(size) };
        })
      };
    }

    // Add emp ty array
    function addNullValues(data) {
      _.forIn(data, function (value, key) {
        if (key === 'pie') { value.rows.push({slices: {children: []}}); }
        else {
          value.rows.push({series: []});
        }
      });

      ++length; // increment length counter
      return data;
    }

    var length = 2;
    var size = 10;
    var data = {
      pie: generateData(length, size, 'pie'),
      series: generateData(length, size)
    };
    var ValidateVisData;
    var validData;

    addNullValues(data);

    beforeEach(function () {
      module('ValidateVisDataFactory');
      inject(function (Private) {
        ValidateVisData = Private(require('components/vislib/lib/validate_visdata'));
        validData = new ValidateVisData(data.series);
      });
    });

    afterEach(function () {
      validData = null;
    });

    describe('_validate method', function () {
      it('should remove null arrays from chart objects', function () {
        var validSeriesData = validData._validate(data.series, 'histogram');
        var validPieData = validData._validate(data.pie, 'pie');
        var validLength = length - 1;

        expect(validSeriesData.rows.length).to.be(validLength);
        expect(validPieData.rows.length).to.be(validLength);
      });
    });

    describe('_returnValidData method', function () {
      it('should remove null arrays', function () {
        var conditional = function (d) { return d.series.length; };
        var newLength = length - 1;
        var filteredData = validData._returnValidData(data.series, 'rows', conditional);

        expect(filteredData.rows.length).to.be(newLength);

        filteredData.rows.forEach(function (d) {
          expect(d.series.length).to.be.greaterThan(0);
        });
      });
    });

    describe('_getAccessor method', function () {
      it('should the object key for the data array', function () {
        var seriesAccessor = validData._getAccessor(data.series);
        var pieAccessor = validData._getAccessor(data.pie, 'pie');

        expect(seriesAccessor).to.be('rows');
        expect(pieAccessor).to.be('rows');
      });
    });

  });
});