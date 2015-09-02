define(function (require) {
  return function SankeyChartFactory(Private) {
    var d3 = require('d3');
    var _ = require('lodash');
    var $ = require('jquery');

    var S = require('d3-plugins-sankey');
    var formatNumber = d3.format(',.0f');
    var format = function (d) { return formatNumber(d) + ' TWh'; };
    var color = d3.scale.category20();

    var Chart = Private(require('ui/vislib/visualizations/_chart'));
    var errors = require('ui/errors');

    /**
     * Sankey Chart Visualization
     *
     * @class SankeyChart
     * @constructor
     * @extends Chart
     * @param handler {Object} Reference to the Handler Class Constructor
     * @param el {HTMLElement} HTML element to which the chart will be appended
     * @param chartData {Object} Elasticsearch query results for this specific chart
     */
    _.class(SankeyChart).inherits(Chart);
    function SankeyChart(handler, chartEl, chartData) {
      if (!(this instanceof SankeyChart)) {
        return new SankeyChart(handler, chartEl, chartData);
      }
      SankeyChart.Super.apply(this, arguments);

      var charts = this.handler.data.getVisData();
    }


    SankeyChart.prototype._validateContainerSize = function (width, height) {
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
     * @returns {Function} Creates the sankey chart
     */
    SankeyChart.prototype.draw = function () {
      var self = this;
      var $elem = $(this.chartEl);
      var margin = this._attr.margin;
      var elWidth = this._attr.width = $elem.width();
      var elHeight = this._attr.height = $elem.height();
      var width;
      var height;
      var div;
      var svg;

      return function (selection) {
        selection.each(function (data) {
          var energy = data.slices;
          div = d3.select(this);
          width = elWidth - margin.left - margin.right;
          height = elHeight - margin.top - margin.bottom;

          if (!energy.nodes.length) return;

          self._validateContainerSize(width, height);

          svg = div.append('svg')
          .attr('width', elWidth)
          .attr('height', elHeight)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

          var sankey = d3.sankey()
          .nodeWidth(15)
          .nodePadding(10)
          .size([width, height]);

          var path = sankey.link();

          sankey
              .nodes(energy.nodes)
              .links(energy.links)
              .layout(32);

          var link = svg.append('g').selectAll('.link')
              .data(energy.links)
            .enter().append('path')
              .attr('class', 'link')
              .attr('d', path)
              .style('stroke-width', function (d) { return Math.max(1, d.dy); })
              .sort(function (a, b) { return b.dy - a.dy; });

          link.append('title')
              .text(function (d) { return d.source.name + ' → ' + d.target.name + '\n' + format(d.value); });

          var node = svg.append('g').selectAll('.node')
              .data(energy.nodes)
            .enter().append('g')
              .attr('class', 'node')
              .attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; })
            .call(d3.behavior.drag()
              .origin(function (d) { return d; })
              .on('dragstart', function () { this.parentNode.appendChild(this); })
              .on('drag', dragmove));

          node.append('rect')
              .attr('height', function (d) { return d.dy; })
              .attr('width', sankey.nodeWidth())
              .style('fill', function (d) { return d.color = color(d.name.replace(/ .*/, '')); })
              .style('stroke', function (d) { return d3.rgb(d.color).darker(2); })
            .append('title')
              .text(function (d) { return d.name + '\n' + format(d.value); });

          node.append('text')
              .attr('x', -6)
              .attr('y', function (d) { return d.dy / 2; })
              .attr('dy', '.35em')
              .attr('text-anchor', 'end')
              .attr('transform', null)
              .text(function (d) { return d.name; })
            .filter(function (d) { return d.x < width / 2; })
              .attr('x', 6 + sankey.nodeWidth())
              .attr('text-anchor', 'start');

          function dragmove(d) {
            d3.select(this).attr('transform', 'translate(' + d.x + ',' + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ')');
            sankey.relayout();
            link.attr('d', path);
          }

          return svg;
        });
      };
    };

    return SankeyChart;
  };
});
