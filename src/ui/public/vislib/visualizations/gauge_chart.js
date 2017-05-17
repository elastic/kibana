import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import errors from 'ui/errors';
import VislibVisualizationsChartProvider from './_chart';
import GaugeTypesProvider from './gauges/gauge_types';

export default function GaugeChartFactory(Private) {

  const Chart = Private(VislibVisualizationsChartProvider);
  const gaugeTypes = Private(GaugeTypesProvider);
  const defaults = {
    type: 'meter',
    style: {
      bgFill: '#eee'
    }
  };

  class GaugeChart extends Chart {
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);
      this.gaugeConfig = _.defaultsDeep(handler.visConfig.get('gauge', {}), defaults);
      this.gauge = new gaugeTypes[this.gaugeConfig.type](this);
    }

    addEvents(element) {
      const events = this.events;

      return element
        .call(events.addHoverEvent())
        .call(events.addMouseoutEvent())
        .call(events.addClickEvent());
    }

    draw() {
      const self = this;

      return function (selection) {
        selection.each(function (data) {
          const div = d3.select(this);
          const width = $(this).width() / data.series.length;
          const height = $(this).height() - 25;
          const transformX = width / 2;
          const transformY = self.gaugeConfig.gaugeType === 'Meter' ? height / 1.5 : height / 2;



          data.series.forEach(series => {
            const svg = div.append('svg')
              .attr('width', width)
              .attr('height', height)
              .style('display', 'inline-block');

            const g = svg.append('g')
              .attr('transform', `translate(${transformX}, ${transformY})`);

            const gauges = self.gauge.drawGauge(g, series, width, height);
            self.addEvents(gauges);
          });

          div.append('div')
            .attr('class', 'chart-title')
            .style('text-align', 'center')
            .text(data.label || data.yAxisLabel);

          self.events.emit('rendered', {
            chart: data
          });

          return div;
        });
      };
    }
  }

  return GaugeChart;
}
