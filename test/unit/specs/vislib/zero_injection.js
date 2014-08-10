define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  angular.module('ZeroInjectionUtilService', ['kibana']);
  angular.module('FlattenDataObjectUtilService', ['kibana']);
  angular.module('OrderedXKeysUtilService', ['kibana']);
  angular.module('ReplaceIndexUtilService', ['kibana']);
  angular.module('UniqueXValuesUtilService', ['kibana']);
  angular.module('ZeroFillDataArrayUtilService', ['kibana']);
  angular.module('ZeroFilledArrayUtilService', ['kibana']);

  describe('Vislib Zero Injection Module Test Suite', function () {
    var data1 = {
      series: [
        {
          label: '200',
          values: [
            {
              x: 'value1',
              y: 234
            },
            {
              x: 'value2',
              y: 34
            },
            {
              x: 'value3',
              y: 834
            },
            {
              x: 'value4',
              y: 1234
            },
            {
              x: 'value5',
              y: 4
            }
          ]
        }
      ]
    };

    var data2 = {
      series: [
        {
          label: '200',
          values: [
            {
              x: 1,
              y: 234
            },
            {
              x: 2,
              y: 34
            },
            {
              x: 3,
              y: 834
            },
            {
              x: 4,
              y: 1234
            },
            {
              x: 5,
              y: 4
            }
          ]
        },
        {
          label: '404',
          values: [
            {
              x: 4,
              y: 1234
            },
            {
              x: 1,
              y: 234
            },
            {
              x: 2,
              y: 34
            }
          ]
        },
        {
          label: '503',
          values: [
            {
              x: 3,
              y: 834
            }
          ]
        }
      ]
    };
    var ordered = {};

    describe('Zero Injection (main)', function () {
      var injectZeros;
      var sample1;
      var sample2;

      beforeEach(function () {
        module('ZeroInjectionUtilService');
      });

      beforeEach(function () {
        inject(function (Private) {
          injectZeros = Private(require('components/vislib/components/_functions/zero_injection/inject_zeros'));
          sample1 = injectZeros(data1.series, false);
          sample2 = injectZeros(data2.series, ordered);
        });
      });

      it('should be a function', function () {
        expect(_.isFunction(injectZeros)).to.be(true);
      });

      it('should return an array of objects', function () {
        expect(_.isArray(sample1)).to.be(true);
        expect(_.isObject(sample1[0])).to.be(true);
      });

      it('should return the same array of objects when the length of the series array is 1', function () {
        expect(sample1[0].values[0].x).to.be(data1.series[0].values[0].x);
        expect(sample1[0].values[1].x).to.be(data1.series[0].values[1].x);
        expect(sample1[0].values[2].x).to.be(data1.series[0].values[2].x);
        expect(sample1[0].values[3].x).to.be(data1.series[0].values[3].x);
        expect(sample1[0].values[4].x).to.be(data1.series[0].values[4].x);
      });

      it('should inject zeros in the input array', function () {
        expect(sample2[1].values[2].y).to.be(0);
        expect(sample2[1].values[4].y).to.be(0);
        expect(sample2[2].values[0].y).to.be(0);
        expect(sample2[2].values[1].y).to.be(0);
        expect(sample2[2].values[3].y).to.be(0);
        expect(sample2[2].values[4].y).to.be(0);
      });

      it('should return values arrays with the same x values', function () {
        expect(sample2[1].values[0].x).to.be(sample2[2].values[0].x);
        expect(sample2[1].values[1].x).to.be(sample2[2].values[1].x);
        expect(sample2[1].values[2].x).to.be(sample2[2].values[2].x);
        expect(sample2[1].values[3].x).to.be(sample2[2].values[3].x);
        expect(sample2[1].values[4].x).to.be(sample2[2].values[4].x);
      });

      it('should return values arrays of the same length', function () {
        expect(sample2[0].values.length).to.be(sample2[1].values.length);
        expect(sample2[0].values.length).to.be(sample2[2].values.length);
        expect(sample2[1].values.length).to.be(sample2[2].values.length);
      });
    });

    describe('Order X Values', function () {
      var orderXValues;
      var results;

      beforeEach(function () {
        module('OrderedXKeysUtilService');
      });

      beforeEach(function () {
        inject(function (Private) {
          orderXValues = Private(require('components/vislib/components/_functions/zero_injection/ordered_x_keys'));
          results = orderXValues(data2.series);
        });
      });

      it('should return a function', function () {
        expect(_.isFunction(orderXValues)).to.be(true);
      });

      it('should return an array', function () {
        expect(_.isArray(results)).to.be(true);
      });

      it('should return an array of values in the correct order', function () {
        expect(results[0]).to.be('1');
        expect(results[1]).to.be('2');
        expect(results[2]).to.be('3');
        expect(results[3]).to.be('4');
        expect(results[4]).to.be('5');
      });
    });

    describe('Unique Keys', function () {
      var uniqueKeys;
      var results;

      beforeEach(function () {
        module('UniqueXValuesUtilService');
      });

      beforeEach(function () {
        inject(function (Private) {
          uniqueKeys = Private(require('components/vislib/components/_functions/zero_injection/uniq_keys'));
          results = uniqueKeys(data2.series);
        });
      });

      it('should return a function', function () {
        expect(_.isFunction(uniqueKeys)).to.be(true);
      });

      it('should return an object', function () {
        expect(_.isObject(results)).to.be(true);
      });

      it('should return an object of unique keys', function () {
        expect(_.uniq(_.keys(results)).length).to.be(_.keys(results).length);
      });
    });

    describe('Replace Index', function () {
      var replaceIndex;
      var arr = [
        { x: 1, y: 2},
        { x: 2, y: 3},
        { x: 3, y: 4}
      ];
      var index = 1;
      var obj = { x: 2, y: 5 };
      var results;

      beforeEach(function () {
        module('ReplaceIndexUtilService');
      });

      beforeEach(function () {
        inject(function (Private) {
          replaceIndex = Private(require('components/vislib/components/_functions/zero_injection/replace_index'));
          results = replaceIndex(arr, index, obj);
        });
      });

      it('should return a function', function () {
        expect(_.isFunction(replaceIndex)).to.be(true);
      });

      it('should return an array', function () {
        expect(_.isArray(results)).to.be(true);
      });

      it('should replace the object at the index in the array with the new object', function () {
        expect(results[1].y).to.be(5);
      });
    });

    describe('Flatten Data', function () {
      var flattenData;
      var results;

      beforeEach(function () {
        module('ReplaceIndexUtilService');
      });

      beforeEach(function () {
        inject(function (Private) {
          flattenData = Private(require('components/vislib/components/_functions/zero_injection/flatten_data'));
          results = flattenData(data2.series);
        });
      });

      it('should return a function', function () {
        expect(_.isFunction(flattenData)).to.be(true);
      });

      it('should return an array', function () {
        expect(_.isArray(results)).to.be(true);
      });

      it('should return an array of objects', function () {
        expect(_.isObject(results[0])).to.be(true);
        expect(_.isObject(results[1])).to.be(true);
        expect(_.isObject(results[2])).to.be(true);
      });
    });

    describe('Zero Filled Array', function () {
      var createZeroArray;
      var arr = ['1', '2', '3', '4', '5'];
      var results1;
      var results2;

      beforeEach(function () {
        module('ZeroFilledArrayUtilService');
      });

      beforeEach(function () {
        inject(function (Private) {
          createZeroArray = Private(require('components/vislib/components/_functions/zero_injection/zero_filled_array'));
          results1 = createZeroArray(arr, ordered);
          results2 = createZeroArray(arr, false);
        });
      });

      it('should return a function', function () {
        expect(_.isFunction(createZeroArray)).to.be(true);
      });

      it('should return an array', function () {
        expect(_.isArray(results1)).to.be(true);
      });

      it('should return an array of objects', function () {
        expect(_.isObject(results1[0])).to.be(true);
        expect(_.isObject(results1[1])).to.be(true);
        expect(_.isObject(results1[2])).to.be(true);
        expect(_.isObject(results1[3])).to.be(true);
        expect(_.isObject(results1[4])).to.be(true);
      });

      it('should return an array of objects where each y value is 0', function () {
        expect(results1[0].y).to.be(0);
        expect(results1[1].y).to.be(0);
        expect(results1[2].y).to.be(0);
        expect(results1[3].y).to.be(0);
        expect(results1[4].y).to.be(0);
      });

      it('should return an array of objects where each x values are numbers when ordered obj is defined', function () {
        expect(_.isNumber(results1[0].x)).to.be(true);
        expect(_.isNumber(results1[1].x)).to.be(true);
        expect(_.isNumber(results1[2].x)).to.be(true);
        expect(_.isNumber(results1[3].x)).to.be(true);
        expect(_.isNumber(results1[4].x)).to.be(true);
      });

      it('should return an array of objects where each x values are strings when ordered obj is undefined', function () {
        expect(_.isString(results2[0].x)).to.be(true);
        expect(_.isString(results2[1].x)).to.be(true);
        expect(_.isString(results2[2].x)).to.be(true);
        expect(_.isString(results2[3].x)).to.be(true);
        expect(_.isString(results2[4].x)).to.be(true);
      });
    });

    describe('Zero Filled Data Array', function () {
      var zeroFillArray;
      var xValueArr = [1, 2, 3, 4, 5];
      var createZeroArray;
      var arr1;
      var arr2 = data2.series[2].values;
      var results;

      beforeEach(function () {
        module('ZeroFillDataArrayUtilService');
      });

      beforeEach(function () {
        inject(function (Private) {
          zeroFillArray = Private(require('components/vislib/components/_functions/zero_injection/zero_fill_data_array'));
          createZeroArray = Private(require('components/vislib/components/_functions/zero_injection/zero_filled_array'));
          arr1 = createZeroArray(xValueArr);
          // Takes zero array as 1st arg and data array as 2nd arg
          results = zeroFillArray(arr1, arr2);
        });
      });

      it('should return a function', function () {
        expect(_.isFunction(zeroFillArray)).to.be(true);
      });

      it('should return an array', function () {
        expect(_.isArray(results)).to.be(true);
      });

      it('should return an array of objects', function () {
        expect(_.isObject(results[0])).to.be(true);
        expect(_.isObject(results[1])).to.be(true);
        expect(_.isObject(results[2])).to.be(true);
      });

      it('should return an array with zeros injected in the appropriate objects as y values', function () {
        expect(results[0].y).to.be(0);
        expect(results[1].y).to.be(0);
        expect(results[3].y).to.be(0);
        expect(results[4].y).to.be(0);
      });
    });

  });
});
