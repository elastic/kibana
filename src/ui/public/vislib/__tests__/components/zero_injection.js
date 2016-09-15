
import angular from 'angular';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import VislibComponentsZeroInjectionInjectZerosProvider from 'ui/vislib/components/zero_injection/inject_zeros';
import VislibComponentsZeroInjectionOrderedXKeysProvider from 'ui/vislib/components/zero_injection/ordered_x_keys';
import VislibComponentsZeroInjectionUniqKeysProvider from 'ui/vislib/components/zero_injection/uniq_keys';
import VislibComponentsZeroInjectionFlattenDataProvider from 'ui/vislib/components/zero_injection/flatten_data';
import VislibComponentsZeroInjectionZeroFilledArrayProvider from 'ui/vislib/components/zero_injection/zero_filled_array';
import VislibComponentsZeroInjectionZeroFillDataArrayProvider from 'ui/vislib/components/zero_injection/zero_fill_data_array';

describe('Vislib Zero Injection Module Test Suite', function () {
  const dateHistogramRows = {
    'rows': [
      {
        'label': 'Top 5 @tags: success',
        'ordered': {
          'date': true,
          'interval': 60000,
          'min': 1418410540548,
          'max': 1418410936568
        },
        'series': [
          {
            'label': 'jpg',
            'values': [
              { 'x': 1418410560000, 'y': 2 },
              { 'x': 1418410620000, 'y': 4 },
              { 'x': 1418410680000, 'y': 1 },
              { 'x': 1418410740000, 'y': 5 },
              { 'x': 1418410800000, 'y': 2 },
              { 'x': 1418410860000, 'y': 3 },
              { 'x': 1418410920000, 'y': 2 }
            ]
          },
          {
            'label': 'css',
            'values': [
              { 'x': 1418410560000, 'y': 1 },
              { 'x': 1418410620000, 'y': 3 },
              { 'x': 1418410680000, 'y': 1 },
              { 'x': 1418410740000, 'y': 4 },
              { 'x': 1418410800000, 'y': 2 }
            ]
          },
          {
            'label': 'gif',
            'values': [
              { 'x': 1418410500000, 'y': 1 },
              { 'x': 1418410680000, 'y': 3 },
              { 'x': 1418410740000, 'y': 2 }
            ]
          }
        ]
      },
      {
        'label': 'Top 5 @tags: info',
        'ordered': {
          'date': true,
          'interval': 60000,
          'min': 1418410540548,
          'max': 1418410936568
        },
        'series': [
          {
            'label': 'jpg',
            'values': [
              { 'x': 1418410560000, 'y': 4 },
              { 'x': 1418410620000, 'y': 2 },
              { 'x': 1418410680000, 'y': 1 },
              { 'x': 1418410740000, 'y': 5 },
              { 'x': 1418410800000, 'y': 2 },
              { 'x': 1418410860000, 'y': 3 },
              { 'x': 1418410920000, 'y': 2 }
            ]
          },
          {
            'label': 'css',
            'values': [
              { 'x': 1418410620000, 'y': 3 },
              { 'x': 1418410680000, 'y': 1 },
              { 'x': 1418410740000, 'y': 4 },
              { 'x': 1418410800000, 'y': 2 }
            ]
          },
          {
            'label': 'gif',
            'values': [
              { 'x': 1418410500000, 'y': 1 }
            ]
          }
        ]
      },
      {
        'label': 'Top 5 @tags: security',
        'ordered': {
          'date': true,
          'interval': 60000,
          'min': 1418410540548,
          'max': 1418410936568
        },
        'series': [
          {
            'label': 'jpg',
            'values': [
              { 'x': 1418410560000, 'y': 1 },
              { 'x': 1418410620000, 'y': 3 },
              { 'x': 1418410920000, 'y': 2 }
            ]
          },
          {
            'label': 'gif',
            'values': [
              { 'x': 1418410680000, 'y': 3 },
              { 'x': 1418410740000, 'y': 1 }
            ]
          }
        ]
      },
      {
        'label': 'Top 5 @tags: login',
        'ordered': {
          'date': true,
          'interval': 60000,
          'min': 1418410540548,
          'max': 1418410936568
        },
        'series': [
          {
            'label': 'jpg',
            'values': [
              { 'x': 1418410740000, 'y': 1 }
            ]
          },
          {
            'label': 'css',
            'values': [
              { 'x': 1418410560000, 'y': 1 }
            ]
          }
        ]
      },
      {
        'label': 'Top 5 @tags: warning',
        'ordered': {
          'date': true,
          'interval': 60000,
          'min': 1418410540548,
          'max': 1418410936568
        },
        'series': [
          {
            'label': 'jpg',
            'values': [
              { 'x': 1418410860000, 'y': 2 }
            ]
          }
        ]
      }
    ]
  };

  const seriesData = {
    series: [
      {
        label: '200',
        values: [
          {x: 'v1', y: 234},
          {x: 'v2', y: 34},
          {x: 'v3', y: 834},
          {x: 'v4', y: 1234},
          {x: 'v5', y: 4}
        ]
      }
    ]
  };

  const multiSeriesData = {
    series: [
      {
        label: '200',
        values: [
          {x: '1', y: 234},
          {x: '2', y: 34},
          {x: '3', y: 834},
          {x: '4', y: 1234},
          {x: '5', y: 4}
        ]
      },
      {
        label: '404',
        values: [
          {x: '1', y: 1234},
          {x: '3', y: 234},
          {x: '5', y: 34}
        ]
      },
      {
        label: '503',
        values: [
          {x: '3', y: 834}
        ]
      }
    ]
  };

  const multiSeriesNumberedData = {
    series: [
      {
        label: '200',
        values: [
          {x: 1, y: 234},
          {x: 2, y: 34},
          {x: 3, y: 834},
          {x: 4, y: 1234},
          {x: 5, y: 4}
        ]
      },
      {
        label: '404',
        values: [
          {x: 1, y: 1234},
          {x: 3, y: 234},
          {x: 5, y: 34}
        ]
      },
      {
        label: '503',
        values: [
          {x: 3, y: 834}
        ]
      }
    ]
  };

  const childrenObject = {
    children: []
  };
  const seriesObject = {
    series: []
  };
  const rowsObject = {
    rows: []
  };
  const columnsObject = {
    columns: []
  };
  const emptyObject = {};
  const str = 'string';
  const number = 24;
  const boolean = false;
  const nullValue = null;
  const emptyArray = [];
  let notAValue;

  describe('Zero Injection (main)', function () {
    let injectZeros;
    let sample1;
    let sample2;
    let sample3;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      injectZeros = Private(VislibComponentsZeroInjectionInjectZerosProvider);
      sample1 = injectZeros(seriesData);
      sample2 = injectZeros(multiSeriesData);
      sample3 = injectZeros(multiSeriesNumberedData);
    }));

    it('should throw an error if the input is not an object', function () {
      expect(function () {
        injectZeros(str);
      }).to.throwError();

      expect(function () {
        injectZeros(number);
      }).to.throwError();

      expect(function () {
        injectZeros(boolean);
      }).to.throwError();

      expect(function () {
        injectZeros(emptyArray);
      }).to.throwError();

      expect(function () {
        injectZeros(nullValue);
      }).to.throwError();

      expect(function () {
        injectZeros(notAValue);
      }).to.throwError();
    });

    it('should throw an error if property series, rows, or columns is not ' +
    'present', function () {

      expect(function () {
        injectZeros(childrenObject);
      }).to.throwError();
    });

    it('should not throw an error if object has property series, rows, or ' +
    'columns', function () {

      expect(function () {
        injectZeros(seriesObject);
      }).to.not.throwError();

      expect(function () {
        injectZeros(rowsObject);
      }).to.not.throwError();

      expect(function () {
        injectZeros(columnsObject);
      }).to.not.throwError();
    });

    it('should be a function', function () {
      expect(_.isFunction(injectZeros)).to.be(true);
    });

    it('should return an object with series[0].values', function () {
      expect(_.isObject(sample1)).to.be(true);
      expect(_.isObject(sample1.series[0].values)).to.be(true);
    });

    it('should return the same array of objects when the length of the series array is 1', function () {
      expect(sample1.series[0].values[0].x).to.be(seriesData.series[0].values[0].x);
      expect(sample1.series[0].values[1].x).to.be(seriesData.series[0].values[1].x);
      expect(sample1.series[0].values[2].x).to.be(seriesData.series[0].values[2].x);
      expect(sample1.series[0].values[3].x).to.be(seriesData.series[0].values[3].x);
      expect(sample1.series[0].values[4].x).to.be(seriesData.series[0].values[4].x);
    });

    it('should inject zeros in the input array', function () {
      expect(sample2.series[1].values[1].y).to.be(0);
      expect(sample2.series[2].values[0].y).to.be(0);
      expect(sample2.series[2].values[1].y).to.be(0);
      expect(sample2.series[2].values[4].y).to.be(0);
      expect(sample3.series[1].values[1].y).to.be(0);
      expect(sample3.series[2].values[0].y).to.be(0);
      expect(sample3.series[2].values[1].y).to.be(0);
      expect(sample3.series[2].values[4].y).to.be(0);
    });

    it('should return values arrays with the same x values', function () {
      expect(sample2.series[1].values[0].x).to.be(sample2.series[2].values[0].x);
      expect(sample2.series[1].values[1].x).to.be(sample2.series[2].values[1].x);
      expect(sample2.series[1].values[2].x).to.be(sample2.series[2].values[2].x);
      expect(sample2.series[1].values[3].x).to.be(sample2.series[2].values[3].x);
      expect(sample2.series[1].values[4].x).to.be(sample2.series[2].values[4].x);
    });

    it('should return values arrays of the same length', function () {
      expect(sample2.series[0].values.length).to.be(sample2.series[1].values.length);
      expect(sample2.series[0].values.length).to.be(sample2.series[2].values.length);
      expect(sample2.series[1].values.length).to.be(sample2.series[2].values.length);
    });
  });

  describe('Order X Values', function () {
    let orderXValues;
    let results;
    let numberedResults;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      orderXValues = Private(VislibComponentsZeroInjectionOrderedXKeysProvider);
      results = orderXValues(multiSeriesData);
      numberedResults = orderXValues(multiSeriesNumberedData);
    }));

    it('should throw an error if input is not an object', function () {
      expect(function () {
        orderXValues(str);
      }).to.throwError();

      expect(function () {
        orderXValues(number);
      }).to.throwError();

      expect(function () {
        orderXValues(boolean);
      }).to.throwError();

      expect(function () {
        orderXValues(nullValue);
      }).to.throwError();

      expect(function () {
        orderXValues(emptyArray);
      }).to.throwError();

      expect(function () {
        orderXValues(notAValue);
      }).to.throwError();
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
      expect(numberedResults[0]).to.be(1);
      expect(numberedResults[1]).to.be(2);
      expect(numberedResults[2]).to.be(3);
      expect(numberedResults[3]).to.be(4);
      expect(numberedResults[4]).to.be(5);
    });
  });

  describe('Unique Keys', function () {
    let uniqueKeys;
    let results;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      uniqueKeys = Private(VislibComponentsZeroInjectionUniqKeysProvider);
      results = uniqueKeys(multiSeriesData);
    }));

    it('should throw an error if input is not an object', function () {
      expect(function () {
        uniqueKeys(str);
      }).to.throwError();

      expect(function () {
        uniqueKeys(number);
      }).to.throwError();

      expect(function () {
        uniqueKeys(boolean);
      }).to.throwError();

      expect(function () {
        uniqueKeys(nullValue);
      }).to.throwError();

      expect(function () {
        uniqueKeys(emptyArray);
      }).to.throwError();

      expect(function () {
        uniqueKeys(notAValue);
      }).to.throwError();
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

  describe('Flatten Data', function () {
    let flattenData;
    let results;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      flattenData = Private(VislibComponentsZeroInjectionFlattenDataProvider);
      results = flattenData(multiSeriesData);
    }));

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
    let createZeroArray;
    const arr1 = [1, 2, 3, 4, 5];
    const arr2 = ['1', '2', '3', '4', '5'];
    let results1;
    let results2;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      createZeroArray = Private(VislibComponentsZeroInjectionZeroFilledArrayProvider);
      results1 = createZeroArray(arr1);
      results2 = createZeroArray(arr2);
    }));

    it('should throw an error if input is not an array', function () {
      expect(function () {
        createZeroArray(str);
      }).to.throwError();

      expect(function () {
        createZeroArray(number);
      }).to.throwError();

      expect(function () {
        createZeroArray(boolean);
      }).to.throwError();

      expect(function () {
        createZeroArray(nullValue);
      }).to.throwError();

      expect(function () {
        createZeroArray(emptyObject);
      }).to.throwError();

      expect(function () {
        createZeroArray(notAValue);
      }).to.throwError();
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

    it('should return an array of objects where each x values are numbers', function () {
      expect(_.isNumber(results1[0].x)).to.be(true);
      expect(_.isNumber(results1[1].x)).to.be(true);
      expect(_.isNumber(results1[2].x)).to.be(true);
      expect(_.isNumber(results1[3].x)).to.be(true);
      expect(_.isNumber(results1[4].x)).to.be(true);
    });

    it('should return an array of objects where each x values are strings', function () {
      expect(_.isString(results2[0].x)).to.be(true);
      expect(_.isString(results2[1].x)).to.be(true);
      expect(_.isString(results2[2].x)).to.be(true);
      expect(_.isString(results2[3].x)).to.be(true);
      expect(_.isString(results2[4].x)).to.be(true);
    });
  });

  describe('Zero Filled Data Array', function () {
    let zeroFillArray;
    const xValueArr = [1, 2, 3, 4, 5];
    let createZeroArray;
    let arr1;
    const arr2 = [ {x: 3, y: 834} ];
    let results;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      zeroFillArray = Private(VislibComponentsZeroInjectionZeroFillDataArrayProvider);
      createZeroArray = Private(VislibComponentsZeroInjectionZeroFilledArrayProvider);
      arr1 = createZeroArray(xValueArr);

      // Takes zero array as 1st arg and data array as 2nd arg
      results = zeroFillArray(arr1, arr2);
    }));

    it('should throw an error if input are not arrays', function () {
      expect(function () {
        zeroFillArray(str, str);
      }).to.throwError();

      expect(function () {
        zeroFillArray(number, number);
      }).to.throwError();

      expect(function () {
        zeroFillArray(boolean, boolean);
      }).to.throwError();

      expect(function () {
        zeroFillArray(nullValue, nullValue);
      }).to.throwError();

      expect(function () {
        zeroFillArray(emptyObject, emptyObject);
      }).to.throwError();

      expect(function () {
        zeroFillArray(notAValue, notAValue);
      }).to.throwError();
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

  describe('Injected Zero values return in the correct order', function () {
    let injectZeros;
    let results;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      injectZeros = Private(VislibComponentsZeroInjectionInjectZerosProvider);
      results = injectZeros(dateHistogramRows);
    }));

    it('should return an array of objects', function () {
      results.rows.forEach(function (row) {
        expect(_.isArray(row.series[0].values)).to.be(true);
      });
    });

    it('should return ordered x values', function () {
      const values = results.rows[0].series[0].values;
      expect(values[0].x).to.be.lessThan(values[1].x);
      expect(values[1].x).to.be.lessThan(values[2].x);
      expect(values[2].x).to.be.lessThan(values[3].x);
      expect(values[3].x).to.be.lessThan(values[4].x);
      expect(values[4].x).to.be.lessThan(values[5].x);
      expect(values[5].x).to.be.lessThan(values[6].x);
      expect(values[6].x).to.be.lessThan(values[7].x);
    });
  });
});
