import d3 from 'd3';
import _ from 'lodash';
import getColor from 'ui/vislib/components/color/heatmap_color';

export default function GaugeChartFactory(Private) {


  const defaultConfig = {
    showTooltip: true,
    percentageMode: true,
    maxAngle: 2 * Math.PI * 1.3,
    minAngle: 2 * Math.PI * 0.7,
    innerSpace: 5,
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
      bgWidth: 0.5,
      width: 0.9,
      mask: false,
      bgMask: false,
      maskBars: 20,
      maskPadding: 0.3
    }
  };

  class MeterGauge {
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
      const percentageMode = this.gaugeConfig.percentageMode;
      const colorsRange = this.gaugeConfig.colorsRange;
      const labels = [];
      colorsRange.forEach(range => {
        const from = range.from;
        const to = range.to;
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
      for (const i in labels) {
        if (labels[i]) {
          const val = invertColors ? 1 - i / colorsRange.length : i / colorsRange.length;
          colors[labels[i]] = getColor(val, colorSchema);
        }
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

    drawScale(svg, data, radius, angle) {
      const maxAngle = this.gaugeConfig.maxAngle;
      const minAngle = this.gaugeConfig.minAngle;
      const scaleWidth = this.gaugeConfig.scale.width;
      const tickLength = this.gaugeConfig.scale.tickLength;
      const scaleTicks = this.gaugeConfig.scale.ticks;

      const scale = svg.append('g');

      this.gaugeConfig.colorsRange.forEach(range => {
        const color = this.getColorBucket(range.from);

        const scaleArc = d3.svg.arc()
          .startAngle(angle(range.from))
          .endAngle(angle(range.to))
          .innerRadius(radius)
          .outerRadius(radius + scaleWidth);

        scale
          .append('path')
          .attr('d', scaleArc)
          .style('stroke', color)
          .style('fill', color);
      });


      const extents = angle.domain();
      for (let i = 0; i <= scaleTicks; i++) {
        const val = i * (extents[1] - extents[0]) / scaleTicks;
        const tickAngle = angle(val) - Math.PI / 2;
        const x0 = Math.cos(tickAngle) * radius;
        const x1 = Math.cos(tickAngle) * (radius - tickLength);
        const y0 = Math.sin(tickAngle) * radius;
        const y1 = Math.sin(tickAngle) * (radius - tickLength);
        const color = this.getColorBucket(val);
        scale.append('line')
          .attr('x1', x0).attr('x2', x1)
          .attr('y1', y0).attr('y2', y1)
          .style('stroke-width', scaleWidth)
          .style('stroke', color);
      }

      return scale;
    }

    drawBarMask(radius, angle, maskBars, maskPadding, name) {
      const randomNumber = this.randomNumber;
      return function (selection) {
        selection.each(function (d, i, j) {
          const svg = d3.select(this.parentNode).append('defs');
          const mask = svg.append('mask').attr('id', `gauge-mask-${name}-${randomNumber}-${j}`);
          const extents = angle.domain();

          for (let i = 0; i < maskBars; i++) {
            const val = i * (extents[1] - extents[0]) / maskBars;
            const nextVal = (i + 1) * (extents[1] - extents[0]) / maskBars;
            const padding = Math.asin(3 / (2 * radius(j))); //Math.abs(nextVal - val) * maskPadding / 2;
            const maskArc = d3.svg.arc()
              .startAngle(angle(val) + padding)
              .endAngle(angle(nextVal) - padding)
              .innerRadius(radius(j + 1))
              .outerRadius(radius(j));

            mask.append('path')
              .attr('d', maskArc)
              .style('stroke-width', 1)
              .style('stroke-opacity', 0.7)
              .style('stroke', 'white')
              .style('fill', 'white');
          }

          return mask;
        });
      };
    }

    drawScaleLabels(svg, data) {

    }

    drawGauge(svg, data, width, height) {
      const marginFactor = 0.95;
      const tooltip = this.gaugeChart.tooltip;
      const isTooltip = this.gaugeChart.handler.visConfig.get('addTooltip');
      const maxAngle = this.gaugeConfig.maxAngle;
      const minAngle = this.gaugeConfig.minAngle;
      const applyMask = this.gaugeConfig.style.mask;
      const applyMaskToBack = this.gaugeConfig.style.bgMask;
      const angleFactor = this.gaugeConfig.gaugeType === 'Meter' ? 0.75 : 1;
      const maxRadius = (Math.min(width, height / angleFactor) / 2) * marginFactor;
      const randomNumber = this.randomNumber;

      const min = this.gaugeConfig.colorsRange[0].from;
      const max = _.last(this.gaugeConfig.colorsRange).to;
      const angle = d3.scale.linear()
        .range([minAngle, maxAngle])
        .domain([min, max]);
      const radius = d3.scale.linear()
        .range([0, maxRadius])
        .domain([this.gaugeConfig.innerSpace + 1, 0]);

      const totalWidth = Math.abs(radius(0) - radius(1));
      const bgPadding = totalWidth * (1 - this.gaugeConfig.style.bgWidth) / 2;
      const gaugePadding = totalWidth * (1 - this.gaugeConfig.style.width) / 2;
      const arc = d3.svg.arc()
        .startAngle(minAngle)
        .endAngle(function (d) {
          return Math.max(0, Math.min(maxAngle, angle(d.y)));
        })
        .innerRadius(function (d, i, j) {
          return Math.max(0, radius(j + 1) + gaugePadding);
        })
        .outerRadius(function (d, i, j) {
          return Math.max(0, radius(j) - gaugePadding);
        });


      const bgArc = d3.svg.arc()
        .startAngle(minAngle)
        .endAngle(maxAngle)
        .innerRadius(function (d, i, j) {
          return Math.max(0, radius(j + 1) + bgPadding);
        })
        .outerRadius(function (d, i, j) {
          return Math.max(0, radius(j) - bgPadding);
        });

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


      const paths = gauges
        .append('path')
        .attr('d', bgArc)
        .style('fill', this.gaugeConfig.style.bgFill)
        .attr('mask', (d, i, j) => {
          return applyMaskToBack ? `url(#gauge-mask-back-${randomNumber}-${j})` : '';
        });


      if (applyMask) {
        const maskBars = this.gaugeConfig.style.maskBars;
        const maskPadding = this.gaugeConfig.style.maskPadding;
        paths.call(this.drawBarMask(radius, angle, maskBars, maskPadding, 'front'));
      }

      if (applyMaskToBack) {
        const maskBars = this.gaugeConfig.style.bgMaskBars;
        const maskPadding = this.gaugeConfig.style.bgMaskPadding;
        paths.call(this.drawBarMask(radius, angle, maskBars, maskPadding, 'back'));
      }

      const self = this;
      const series = gauges
        .append('path')
        .attr('d', arc)
        .style('fill', function (d) {
          return self.getColorBucket(d.y);
        })
        .attr('mask', (d, i, j) => {
          return applyMask ? `url(#gauge-mask-front-${randomNumber}-${j})` : '';
        });

      svg
        .append('text')
        .attr('class', 'chart-label')
        .text(data.label)
        .attr('y', -25)
        .attr('style', 'dominant-baseline: central; text-anchor: middle;');

      if (this.gaugeConfig.labels.show) {
        gauges
          .append('text')
          .attr('class', 'chart-label')
          .text(d => {
            if (this.gaugeConfig.percentageMode) {
              const percentage = Math.round(100 * (d.y - min) / (max - min));
              return `${percentage}%`;
            }
            return d.y;
          })
          .attr('style', 'dominant-baseline: central;')
          .style('text-anchor', 'middle')
          .style('font-size', '2em');
      }

      if (this.gaugeConfig.scale.show) {
        this.drawScale(svg, data, radius(1), angle);
      }

      if (isTooltip) {
        series.each(function () {
          const gauge = d3.select(this);
          gauge.call(tooltip.render());
        });
      }

      return series;
    }
  }

  return MeterGauge;
}
