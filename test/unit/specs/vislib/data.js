define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  var seriesData = {
    'label': '',
    'series': [
      {
        'label': '100',
        'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
      }
    ]
  };

  var rowsData = {
    'rows': [
      {
        'label': 'a',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'b',
        'series': [
          {
            'label': '300',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'c',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'd',
        'series': [
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      }
    ]
  };

  var colsData = {
    'columns': [
      {
        'label': 'a',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'b',
        'series': [
          {
            'label': '300',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'c',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'd',
        'series': [
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      }
    ]
  };

  var seriesData2 = {
    'label': '',
    'series': [
      {
        'label': '100',
        'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
      },
      {
        'label': '200',
        'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
      }
    ]
  };

  var rowsData2 = {
    'rows': [
      {
        'label': 'a',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          },
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'b',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          },
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      }
    ]
  };

  var colsData2 = {
    'columns': [
      {
        'label': 'a',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          },
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'b',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          },
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      }
    ]
  };

  var flattenedData = [
    [{x: 0, y: 0}, {x: 1, y: 2}, {x: 2, y: 4}, {x: 3, y: 6}, {x: 4, y: 8}],
    [{x: 0, y: 0}, {x: 1, y: 2}, {x: 2, y: 4}, {x: 3, y: 6}, {x: 4, y: 8}],
    [{x: 0, y: 0}, {x: 1, y: 2}, {x: 2, y: 4}, {x: 3, y: 6}, {x: 4, y: 8}]
  ];

  angular.module('DataFactory', ['kibana']);

  describe('Vislib Data Class Test Suite', function () {

    describe('Data Class (main)', function () {
      var dataFactory;
      var rowIn;

      beforeEach(function () {
        module('DataFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          dataFactory = Private(require('components/vislib/modules/Data'));
        });
        rowIn = new dataFactory(rowsData);
      });

      it('should be a function', function () {
        expect(_.isFunction(dataFactory)).to.be(true);
      });

      it('should return an object', function () {
        expect(_.isObject(rowIn)).to.be(true);
      });

    });

    describe('Data.flatten', function () {
      var dataFactory;
      var serIn;
      var rowIn;
      var colIn;
      var serOut;
      var rowOut;
      var colOut;

      beforeEach(function () {
        module('DataFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          dataFactory = Private(require('components/vislib/modules/Data'));
        });
        serIn = new dataFactory(seriesData);
        rowIn = new dataFactory(rowsData);
        colIn = new dataFactory(colsData);
        serOut = serIn.flatten();
        rowOut = rowIn.flatten();
        colOut = colIn.flatten();
      });

      it('should return an array of arrays', function () {
        expect(_.isArray(serOut)).to.be(true);
      });

      it('should return array length 3', function () {
        expect(serOut[0][0].length).to.be(3);
      });

      it('should return array length 3', function () {
        expect(rowOut[0][0].length).to.be(3);
      });

      it('should return array length 3', function () {
        expect(colOut[0][0].length).to.be(3);
      });

    });

    describe('Data.stack', function () {
      var dataFactory;
      var rowIn;
      var rowOut;

      beforeEach(function () {
        module('DataFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          dataFactory = Private(require('components/vislib/modules/Data'));
        });
        rowIn = new dataFactory(rowsData);
        rowOut = rowIn.stack(flattenedData);
      });
      
      it('should return an array of arrays of d3 stacked objs', function () {
        expect(_.isArray(rowOut)).to.be(true);
      });

      it('should return y0 = 0 for first array objs', function () {
        expect(rowOut[0][0].y0).to.be(0);
        expect(rowOut[0][1].y0).to.be(0);
        expect(rowOut[0][2].y0).to.be(0);
        expect(rowOut[0][3].y0).to.be(0);
        expect(rowOut[0][4].y0).to.be(0);
      });
      
      it('should return y0 = sum of y vals from prev array objs', function () {
        expect(rowOut[0][0].y + rowOut[1][0].y).to.equal(rowOut[2][0].y0);
        expect(rowOut[0][1].y + rowOut[1][1].y).to.equal(rowOut[2][1].y0);
        expect(rowOut[0][2].y + rowOut[1][2].y).to.equal(rowOut[2][2].y0);
        expect(rowOut[0][3].y + rowOut[1][3].y).to.equal(rowOut[2][3].y0);
        expect(rowOut[0][4].y + rowOut[1][4].y).to.equal(rowOut[2][4].y0);
      });

    });

    describe('Data.isStacked', function () {
      var dataFactory;
      var serIn;
      var rowIn;
      var colIn;
      var serIn2;
      var rowIn2;
      var colIn2;
      var serOut;
      var rowOut;
      var colOut;
      var serOut2;
      var rowOut2;
      var colOut2;
      beforeEach(function () {
        module('DataFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          dataFactory = Private(require('components/vislib/modules/Data'));
        });
        serIn = new dataFactory(seriesData);
        rowIn = new dataFactory(rowsData);
        colIn = new dataFactory(colsData);
        serIn2 = new dataFactory(seriesData2);
        rowIn2 = new dataFactory(rowsData2);
        colIn2 = new dataFactory(colsData2);
        serOut = serIn.isStacked();
        rowOut = rowIn.isStacked();
        colOut = colIn.isStacked();
        serOut2 = serIn2.isStacked();
        rowOut2 = rowIn2.isStacked();
        colOut2 = colIn2.isStacked();
      });
      
      it('should return false when data.series length <= 1', function () {
        expect(serOut).to.be(false);
      });

      it('should return false when rows data.series length <= 1', function () {
        expect(rowOut).to.be(false);
      });

      it('should return false when columns data.series length <= 1', function () {
        expect(colOut).to.be(false);
      });
      
      it('should return true when data.series length > 1', function () {
        expect(serOut2).to.be(true);
      });

      it('should return true when rows data.series length > 1', function () {
        expect(rowOut2).to.be(true);
      });

      it('should return true when columns data.series length > 1', function () {
        expect(colOut2).to.be(true);
      });

    });

    describe('Data.getYMaxValue', function () {
      var dataFactory;
      var serIn;
      var rowIn;
      var colIn;
      var serOut;
      var rowOut;
      var colOut;

      beforeEach(function () {
        module('DataFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          dataFactory = Private(require('components/vislib/modules/Data'));
        });
        serIn = new dataFactory(seriesData2);
        rowIn = new dataFactory(rowsData2);
        colIn = new dataFactory(colsData2);
        serOut = serIn.getYMaxValue();
        rowOut = rowIn.getYMaxValue();
        colOut = colIn.getYMaxValue();
      });

      it('should return a number', function () {
        expect(_.isNumber(serOut)).to.be(true);
      });

      it('should return a number', function () {
        expect(_.isNumber(rowOut)).to.be(true);
      });

      it('should return a number', function () {
        expect(_.isNumber(colOut)).to.be(true);
      });
    });

    describe('Data.getYStackMax', function () {
      var dataFactory;
      var serIn;
      var rowIn;
      var colIn;
      var serIn2;
      var rowIn2;
      var colIn2;
      var serOut;
      var rowOut;
      var colOut;

      beforeEach(function () {
        module('DataFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          dataFactory = Private(require('components/vislib/modules/Data'));
        });
        serIn = new dataFactory(seriesData);
        rowIn = new dataFactory(rowsData2);
        colIn = new dataFactory(colsData2);
        serIn2 = serIn.flatten();
        rowIn2 = rowIn.flatten();
        colIn2 = colIn.flatten();
        serOut = serIn.getYStackMax(serIn2[0]);
        rowOut = rowIn.getYStackMax(rowIn2[0]);
        colOut = colIn.getYStackMax(colIn2[0]);
      });

      it('should return a number', function () {
        expect(_.isNumber(serOut)).to.be(true);
      });

      it('should return a number', function () {
        expect(_.isNumber(rowOut)).to.be(true);
      });

      it('should return a number', function () {
        expect(_.isNumber(colOut)).to.be(true);
      });
    });

  });
});
