import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import { PieContainsAllZeros, ContainerTooSmall } from 'ui/errors';
import VislibVisualizationsChartProvider from './_chart';
export default function PieChartFactory(Private) {

  const Chart = Private(VislibVisualizationsChartProvider);

  const defaults = {
    isDonut: false,
    showTooltip: true,
    color: undefined,
    fillColor: undefined,
    xValue: d => d.x,
    yValue: d => d.y
  };
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
  class PieChart extends Chart {
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);

      const charts = this.handler.data.getVisData();
      this._validatePieData(charts);

      this._attr = _.defaults(handler.visConfig.get('chart', {}), defaults);
    }


    /**
     * Checks whether pie slices have all zero values.
     * If so, an error is thrown.
     */
    _validatePieData(charts) {
      const isAllZeros = charts.every(function (chart) {
        return chart.slices.children.length === 0;
      });

      if (isAllZeros) {
        throw new PieContainsAllZeros();
      }
    }

    /**
     * Adds Events to SVG paths
     *
     * @method addPathEvents
     * @param element {D3.Selection} Reference to SVG path
     * @returns {D3.Selection} SVG path with event listeners attached
     */
    addPathEvents(element) {
      const events = this.events;

      return element
      .call(events.addHoverEvent())
      .call(events.addMouseoutEvent())
      .call(events.addClickEvent());
    }

    convertToPercentage(slices) {
      (function assignPercentages(slices) {
        if (slices.sumOfChildren != null) return;

        const parent = slices;
        const children = parent.children;
        const parentPercent = parent.percentOfParent;

        const sum = parent.sumOfChildren = Math.abs(children.reduce(function (sum, child) {
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
    }

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
    addPath(width, height, svg, slices) {
      const self = this;
      const marginFactor = 0.95;
      const isDonut = self._attr.isDonut;
      const radius = (Math.min(width, height) / 2) * marginFactor;
      const color = self.handler.data.getPieColorFunc();
      const tooltip = self.tooltip;
      const isTooltip = self._attr.addTooltip;

      const partition = d3.layout.partition()
      .sort(null)
      .value(function (d) {
        return d.percentOfParent * 100;
      });
      const x = d3.scale.linear()
      .range([0, 2 * Math.PI]);
      const y = d3.scale.sqrt()
      .range([0, radius]);
      const arc = d3.svg.arc()
      .startAngle(function (d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
      })
      .endAngle(function (d) {
        if (d.dx < 1e-8) return x(d.x);
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

      const path = svg
      .datum(slices)
      .selectAll('path')
      .data(partition.nodes)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('class', function (d) {
        if (d.depth === 0) {
          return;
        }
        return 'slice';
      })
      .call(self._addIdentifier, 'name')
      .style('stroke', '#fff')
      .style('fill', function (d) {
        if (d.depth === 0) {
          return 'none';
        }
        return color(d.name);
      });

      if (isTooltip) {
        path.call(tooltip.render());
      }

      return path;
    }

    _validateContainerSize(width, height) {
      const minWidth = 20;
      const minHeight = 20;

      if (width <= minWidth || height <= minHeight) {
        throw new ContainerTooSmall();
      }
    }

    /**
     * Renders d3 visualization
     *
     * @method draw
     * @returns {Function} Creates the pie chart
     */
    draw() {
      const self = this;

      return function (selection) {
        selection.each(function (data) {
          const slices = data.slices;
          const div = d3.select(this);
          const width = $(this).width();
          const height = $(this).height();

          if (!slices.children.length) return;

          self.convertToPercentage(slices);
          self._validateContainerSize(width, height);

          const svg = div.append('svg')
          .attr('width', width)
          .attr('height', height)
          .append('g')
          .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

          const path = self.addPath(width, height, svg, slices);
          self.addPathEvents(path);

          self.events.emit('rendered', {
            chart: data
          });

          return svg;
        });
      };
    }
  }

  return PieChart;
}
