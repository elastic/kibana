define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  angular.module('ValidateVisDataFactory', ['kibana']);

  describe('Vislib ValidateVisData Test Suite', function () {
    function generateData(length, size, type) {
      function generateValues(size, type) {
        return Array.apply(null, _.times(size, function () {
          if (type === 'pie') {
            return { size: _.random(1, 100) };
          }

          return {
            x: _.random(1, 100),
            y: _.random(1, 100)
          };
        }));
      }

      return {
        rows: Array.apply(null, _.times(length, function () {
          if (type === 'pie') {
            return {
              slices: { children: generateValues(size, type) }
            };
          }

          return { series: generateValues(size) };
        }))
      };
    }

    // Add empty array
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
    var validateVisData;
    var validSeriesData;
    var validPieData;

    addNullValues(data);

    beforeEach(function () {
      module('ValidateVisDataFactory');
      inject(function (Private) {
        validateVisData = Private(require('components/vislib/lib/validate_visdata'));
        validSeriesData = validateVisData(data.series);
        validPieData = validateVisData(data.pie, 'pie');
      });
    });

    afterEach(function () {
      validSeriesData = null;
      validPieData = null;
    });

    describe('validate method', function () {
      it('should remove null arrays from chart objects', function () {
        var validLength = length - 1;

        expect(validSeriesData.rows.length).to.be(validLength);
        expect(validPieData.rows.length).to.be(validLength);
      });
    });
  });
});