define(function (require) {
  return function PieChartFactory(Private) {
    var d3 = require('d3');
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('ui/vislib/visualizations/_chart'));
    var errors = require('ui/errors');

    /**
     * Pie Chart Visualization
     *
     * @class PieChart
     * @constructor
     * @extends Chart
     * @param handler {Object} Reference to the Handler Class Constructor
     * @param el {HTMLElement} HTML element to which the chart will be appended
     * @param chartData {Object} Elasticsearch query results for this specific chart
     */
    _.class(PieChart).inherits(Chart);
    function PieChart(handler, chartEl, chartData) {
      if (!(this instanceof PieChart)) {
        return new PieChart(handler, chartEl, chartData);
      }
      PieChart.Super.apply(this, arguments);

      var charts = this.handler.data.getVisData();
      this._validatePieData(charts);

      this._attr = _.defaults(handler._attr || {}, {
        isDonut: handler._attr.isDonut || false
      });
    }

    /**
     * Checks whether pie slices have all zero values.
     * If so, an error is thrown.
     */
    PieChart.prototype._validatePieData = function (charts) {
      var isAllZeros = charts.every(function (chart) {
        return chart.slices.children.length === 0;
      });

      if (isAllZeros) { throw new errors.PieContainsAllZeros(); }
    };

    /**
     * Adds Events to SVG paths
     *
     * @method addPathEvents
     * @param element {D3.Selection} Reference to SVG path
     * @returns {D3.Selection} SVG path with event listeners attached
     */
    PieChart.prototype.addPathEvents = function (element) {
      var events = this.events;

      return element
        .call(events.addHoverEvent())
        .call(events.addMouseoutEvent())
        .call(events.addClickEvent());
    };

    PieChart.prototype.convertToPercentage = function (slices) {
      (function assignPercentages(slices) {
        if (slices.sumOfChildren != null) return;

        var parent = slices;
        var children = parent.children;
        var parentPercent = parent.percentOfParent;

        var sum = parent.sumOfChildren = Math.abs(children.reduce(function (sum, child) {
          return sum + Math.abs(child.size);
        }, 0));

        children.forEach(function (child) {
          child.percentOfGroup = Math.abs(child.size) / sum;
          child.percentOfParent = child.percentOfGroup;

          if (parentPercent != null) {
            child.percentOfParent *= parentPercent;
          }

          if (child.children) {
            assignPercentages(child);
          }
        });
      }(slices));
    };

    /**
     * Adds pie paths to SVG
     *
     * @method addPath
     * @param width {Number} Width of SVG
     * @param height {Number} Height of SVG
     * @param svg {HTMLElement} Chart SVG
     * @param slices {Object} Chart data
     * @returns {D3.Selection} SVG with paths attached
     */
    PieChart.prototype.addPath = function (width, height, svg, slices) {
      var self = this;
      var marginFactor = 0.95;
      var isDonut = self._attr.isDonut;
      var radius = (Math.min(width, height) / 2) * marginFactor;
      var color = self.handler.data.getPieColorFunc();
      var tooltip = self.tooltip;
      var isTooltip = self._attr.addTooltip;

      var partition = d3.layout.partition()
      .sort(null)
      .value(function (d) {
        return d.percentOfParent * 100;
      });
      var x = d3.scale.linear()
      .range([0, 2 * Math.PI]);
      var y = d3.scale.sqrt()
      .range([0, radius]);
      var arc = d3.svg.arc()
      .startAngle(function (d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
      })
      .endAngle(function (d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
      })
      .innerRadius(function (d) {
        // option for a single layer, i.e pie chart
        if (d.depth === 1 && !isDonut) {
          // return no inner radius
          return 0;
        }

        return Math.max(0, y(d.y));
      })
      .outerRadius(function (d) {
        return Math.max(0, y(d.y + d.dy));
      });

      var path = svg
      .datum(slices)
      .selectAll('path')
      .data(partition.nodes)
      .enter()
        .append('path')
        .attr('d', arc)
        .attr('class', function (d) {
          if (d.depth === 0) { return; }
          return 'slice';
        })
        .call(self._addIdentifier, 'name')
        .style('stroke', '#fff')
        .style('fill', function (d) {
          if (d.depth === 0) { return 'none'; }
          return color(d.name);
        });

      if (isTooltip) {
        path.call(tooltip.render());
      }

      return path;
    };

    PieChart.prototype._validateContainerSize = function (width, height) {
      var minWidth = 20;
      var minHeight = 20;

      if (width <= minWidth || height <= minHeight) {
        throw new errors.ContainerTooSmall();
      }
    };

    /**
     * Renders d3 visualization
     *
     * @method draw
     * @returns {Function} Creates the pie chart
     */
    PieChart.prototype.draw = function () {
      var self = this;

      return function (selection) {
        selection.each(function (data) {
          var slices = data.slices;
          var div = d3.select(this);
          var width = $(this).width();
          var height = $(this).height();
          var path;

          if (!slices.children.length) return;

          self.convertToPercentage(slices);
          self._validateContainerSize(width, height);

          var svg = div.append('svg')
          .attr('width', width)
          .attr('height', height)
          .append('g')
          .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

          path = self.addPath(width, height, svg, slices);
          self.addPathEvents(path);

          return svg;
        });
      };
    };

    return PieChart;
  };
});
