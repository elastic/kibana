define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  angular.module('TooltipFactory', ['kibana']);

  describe('Vislib Tooltip', function () {
    var Tooltip;
    var bars;
    var tip;
    var el;
    var chart;

    var data = [
      {
        x: 10,
        y: 8
      },
      {
        x: 11,
        y: 23
      },
      {
        x: 12,
        y: 30
      },
      {
        x: 13,
        y: 28
      },
      {
        x: 14,
        y: 36
      },
      {
        x: 15,
        y: 30
      }
    ];

    beforeEach(function () {
      module('TooltipFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        Tooltip = Private(require('components/vislib/lib/tooltip'));

        el = d3.select('body')
          .append('div')
          .attr('class', 'vis-col-wrapper')
          .style('width', '40px')
          .style('height', '40px');

        tip = new Tooltip(el[0][0], function (d) {
          return 'd.x: ' + d.x + ', d.y: ' + d.y;
        });

        chart = el.append('div').attr('class', 'chart');
        el.append('div').attr('class', 'y-axis-col-wrapper');
        el.append('div').attr('class', 'k4tip');

        bars = chart.selectAll('div')
          .data(data)
          .enter()
          .append('div')
          .attr('class', 'bars')
          .style('width', function (d) {
            return d.y;
          })
          .style('height', '10px')
          .text(function (d) {
            return d.y;
          });

        bars.call(tip.render());

        // d3.select('.bars').on('mousemove.tip')(d3.select('.bars').node().__data__, 0);
      });



    });

    afterEach(function () {
      el.remove();
    });

    it('should be an object', function () {
      expect(_.isObject(Tooltip)).to.be(true);
    });

    it('should return a function', function () {
      expect(typeof Tooltip).to.be('function');
    });
  });

});
