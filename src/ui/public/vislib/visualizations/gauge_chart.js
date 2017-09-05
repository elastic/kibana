import d3 from 'd3';
import $ from 'jquery';
import { VislibVisualizationsChartProvider } from './_chart';
import { GaugeTypesProvider } from './gauges/gauge_types';

export function GaugeChartProvider(Private) {

  const Chart = Private(VislibVisualizationsChartProvider);
  const gaugeTypes = Private(GaugeTypesProvider);

  class GaugeChart extends Chart {
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);
      this.gaugeConfig = handler.visConfig.get('gauge', {});
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
      const verticalSplit = this.gaugeConfig.verticalSplit;

      return function (selection) {
        selection.each(function (data) {
          const div = d3.select(this);
          const containerMargin = 5;
          const containerWidth = $(this).width() - containerMargin;
          const containerHeight = $(this).height() - containerMargin;
          let extraMargin = 0;
          const shrinkFont = self.handler.visConfig.get('gauge.style.shrinkFont', false);
          if (shrinkFont && !verticalSplit) {
            // add a little extra margin to prevent simple metrics from running up against each other
            extraMargin = 3;
            // prevent the last metric from disappearing during the font size calculation
            div.style('white-space', 'nowrap');
          }
          const width = Math.floor(verticalSplit ? $(this).width() : (containerWidth / data.series.length) - extraMargin * 2);
          const height = Math.floor((verticalSplit ? containerHeight / data.series.length : $(this).height()) - 25);
          const transformX = width / 2;
          const transformY = self.gaugeConfig.gaugeType === 'Meter' ? height / 1.5 : height / 2;

          data.series.forEach(series => {
            const svg = div.append('svg')
              .attr('width', width)
              .attr('height', height)
              .style('margin-left', `${extraMargin}px`)
              .style('margin-right', `${extraMargin}px`)
              .style('display', 'inline-block')
              .style('overflow', 'hidden');

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
