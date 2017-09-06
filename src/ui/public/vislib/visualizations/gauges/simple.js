import d3 from 'd3';
import _ from 'lodash';
import { getHeatmapColors } from 'ui/vislib/components/color/heatmap_color';

export function SimpleGaugeProvider() {


  const defaultConfig = {
    showTooltip: true,
    percentageMode: true,
    extents: [0, 10000],
    scale: {
      show: true,
      color: '#666',
      width: 2,
      ticks: 10,
      tickLength: 5,
    },
    labels: {
      show: true,
      color: '#666'
    },
    style: {
      bgColor: true,
      bgFill: '#666'
    }
  };

  class SimpleGauge {
    constructor(gaugeChart) {
      this.gaugeChart = gaugeChart;
      this.gaugeConfig = gaugeChart.gaugeConfig;
      this.gaugeConfig = _.defaultsDeep(this.gaugeConfig, defaultConfig);
      this.randomNumber = Math.round(Math.random() * 100000);

      this.gaugeChart.handler.visConfig.set('legend', {
        labels: this.getLabels(),
        colors: this.getColors()
      });

      const colors = this.gaugeChart.handler.visConfig.get('legend.colors', null);
      if (colors) {
        this.gaugeChart.handler.vis.uiState.setSilent('vis.defaultColors', null);
        this.gaugeChart.handler.vis.uiState.setSilent('vis.defaultColors', colors);
      }

      this.colorFunc = this.gaugeChart.handler.data.getColorFunc();
    }

    getLabels() {
      const isPercentageMode = this.gaugeConfig.percentageMode;
      const colorsRange = this.gaugeConfig.colorsRange;
      const max = _.last(colorsRange).to;
      const labels = [];
      colorsRange.forEach(range => {
        const from = isPercentageMode ? Math.round(100 * range.from / max) : range.from;
        const to = isPercentageMode ? Math.round(100 * range.to / max) : range.to;
        labels.push(`${from} - ${to}`);
      });

      return labels;
    }

    getColors() {
      const invertColors = this.gaugeConfig.invertColors;
      const colorSchema = this.gaugeConfig.colorSchema;
      const colorsRange = this.gaugeConfig.colorsRange;
      const labels = this.getLabels();
      const colors = {};
      for (let i = 0; i < labels.length; i += 1) {
        const divider = Math.max(colorsRange.length - 1, 1);
        const val = invertColors ? 1 - i / divider : i / divider;
        colors[labels[i]] = getHeatmapColors(val, colorSchema);
      }
      return colors;
    }

    getBucket(val) {
      let bucket = _.findIndex(this.gaugeConfig.colorsRange, range => {
        return range.from <= val && range.to > val;
      });

      if (bucket === -1) {
        if (val < this.gaugeConfig.colorsRange[0].from) bucket = 0;
        else bucket = this.gaugeConfig.colorsRange.length - 1;
      }

      return bucket;
    }

    getLabel(val) {
      const bucket = this.getBucket(val);
      const labels = this.gaugeChart.handler.visConfig.get('legend.labels');
      return labels[bucket];
    }

    getColorBucket(val) {
      const bucket = this.getBucket(val);
      const labels = this.gaugeChart.handler.visConfig.get('legend.labels');
      return this.colorFunc(labels[bucket]);
    }

    wrapText(texts, width) {
      texts.each(function () {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        const lineHeight = 1.1;
        const y = text.attr('y');
        const dy = parseFloat(text.attr('dy'));
        let word;
        let lineNumber = 0;
        let line = [];
        let tspan = text.text(null).append('tspan')
          .attr('x', 0)
          .attr('y', y)
          .attr('dy', dy + 'em');
        while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(' '));
          if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(' '));
            line = [ word ];
            tspan = text.append('tspan')
              .attr('x', 0)
              .attr('y', y)
              .attr('dy', ++lineNumber * lineHeight + dy + 'em')
              .text(word);
          }
        }
      });
    }

    drawGauge(svg, data, width) {
      const tooltip = this.gaugeChart.tooltip;
      const isTooltip = this.gaugeChart.handler.visConfig.get('addTooltip');
      const fontSize = this.gaugeChart.handler.visConfig.get('gauge.style.fontSize');

      const labelColor = this.gaugeConfig.style.labelColor;
      const bgColor = this.gaugeConfig.style.bgColor;
      const bgFill = this.gaugeConfig.style.bgFill;
      const min = this.gaugeConfig.colorsRange[0].from;
      const max = _.last(this.gaugeConfig.colorsRange).to;

      const gaugeHolders = svg
        .selectAll('path')
        .data([data])
        .enter()
        .append('g')
        .attr('data-label', (d) => this.getLabel(d.values[0].y));


      const gauges = gaugeHolders
        .selectAll('g')
        .data(d => d.values)
        .enter();


      const self = this;
      const series = gauges
        .append('rect')
        .attr('x', '-45%')
        .attr('y', '-45%')
        .attr('width', '90%')
        .attr('height', '90%')
        .style('fill', function (d) {
          return bgColor ? self.getColorBucket(d.y) : 'transparent';
        });

      const smallContainer = svg.node().getBBox().height < 70;
      let hiddenLabels = smallContainer;

      const isTextTooLong = function () {
        const textLength = this.getBBox().width;
        const textTooLong = textLength > width;
        if (textTooLong) {
          hiddenLabels = true;
        }
        return smallContainer || textTooLong ? 'none' : 'initial';
      };


      if (this.gaugeConfig.labels.show) {
        svg
          .append('text')
          .attr('class', 'chart-label')
          .text(data.label)
          .attr('dy', 0)
          .attr('style', 'dominant-baseline: central; text-anchor: middle; pointer-events: none;')
          .call(this.wrapText, width)
          .attr('y', function () {
            const textMargin = 10;
            const height = this.getBBox().height;
            return (-fontSize / 2) - height - textMargin;
          })
          .style('display', isTextTooLong)
          .style('fill', bgFill);

        svg
          .append('text')
          .attr('class', 'chart-label')
          .text(this.gaugeConfig.style.subText)
          .attr('y', Math.max(15, fontSize))
          .attr('dy', 0)
          .attr('style', 'dominant-baseline: central; text-anchor: middle; pointer-events: none;')
          .call(this.wrapText, width)
          .style('display', isTextTooLong)
          .style('fill', bgFill);
      }

      gauges
        .append('text')
        .attr('class', 'chart-label')
        .attr('y', -5)
        .text(d => {
          if (this.gaugeConfig.percentageMode) {
            const percentage = Math.round(100 * (d.y - min) / (max - min));
            return `${percentage}%`;
          }
          if (d.aggConfig) {
            return d.aggConfig.fieldFormatter('text')(d.y);
          }
          return d.y;
        })
        .attr('style', `dominant-baseline: central; font-weight: bold; white-space: nowrap;
          text-overflow: ellipsis;overflow: hidden; pointer-events: none;`)
        .style('text-anchor', 'middle')
        .style('font-size', fontSize + 'pt')
        .style('fill', function () {
          return !bgColor && labelColor ? self.getColorBucket(data.values[0].y) : bgFill;
        });

      if (isTooltip) {
        series.each(function () {
          const gauge = d3.select(this);
          gauge.call(tooltip.render());
        });
      }

      if (hiddenLabels) {
        this.gaugeChart.handler.alerts.show('Some labels were hidden due to size constraints');
      }

      return series;
    }
  }

  return SimpleGauge;
}
