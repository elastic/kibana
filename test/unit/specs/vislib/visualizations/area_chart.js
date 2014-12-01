define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');

  angular.module('AreaChartFactory', ['kibana']);

  describe('VisLib Area Chart Test Suite', function () {
    describe('checkIfEnoughData method', function () {
      var visLibParams = {
        type: 'area',
        addLegend: true,
        addTooltip: true
      };
      var errorVis;
      var goodVis;
      var notEnoughData;
      var enoughData;

      beforeEach(function () {
        module('AreaChartFactory');
      });

      beforeEach(function () {
        inject(function (Private) {
          errorVis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
          goodVis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
          notEnoughData = require('vislib_fixtures/mock_data/not_enough_data/_one_point');
          enoughData = require('vislib_fixtures/mock_data/series/_data0');
          require('css!components/vislib/styles/main');

          errorVis.render(notEnoughData);
          goodVis.render(enoughData);
        });
      });

      afterEach(function () {
        $(errorVis.el).remove();
        $(goodVis.el).remove();
        errorVis = null;
        goodVis = null;
      });

      it('should throw a Not Enough Data Error', function () {
        errorVis.handler.charts.forEach(function (chart) {
          expect(function () {
            chart.checkIfEnoughData();
          }).to.throwError();
        });
      });

      it('should not throw a Not Enough Data Error', function () {
        goodVis.handler.charts.forEach(function (chart) {
          expect(function () {
            chart.checkIfEnoughData();
          }).to.not.throwError();
        });
      });
    });
  });
});
