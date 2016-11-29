import d3 from 'd3';
import _ from 'lodash';
import VislibVisualizationsChartProvider from 'ui/vislib/visualizations/_chart';
import VislibComponentsTooltipProvider from 'ui/vislib/components/tooltip';
import errors from 'ui/errors';

export default function PointSeriesChartProvider(Private) {

  const Chart = Private(VislibVisualizationsChartProvider);
  const Tooltip = Private(VislibComponentsTooltipProvider);
  const touchdownTmpl = _.template(require('ui/vislib/partials/touchdown.tmpl.html'));

  class PointSeriesChart extends Chart {
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);
    }

    _stackMixedValues(stackCount) {
      let currentStackOffsets = [0, 0];
      let currentStackIndex = 0;

      return function (d, y0, y) {
        const firstStack = currentStackIndex % stackCount === 0;
        const lastStack = ++currentStackIndex === stackCount;

        if (firstStack) {
          currentStackOffsets = [0, 0];
        }

        if (lastStack) currentStackIndex = 0;

        if (y >= 0) {
          d.y0 = currentStackOffsets[1];
          currentStackOffsets[1] += y;
        } else {
          d.y0 = currentStackOffsets[0];
          currentStackOffsets[0] += y;
        }
      };
    };

    /**
     * Stacks chart data values
     *
     * @method stackData
     * @param data {Object} Elasticsearch query result for this chart
     * @returns {Array} Stacked data objects with x, y, and y0 values
     */
    stackData(data) {
      const self = this;
      const isHistogram = (this._attr.type === 'histogram' && this._attr.mode === 'stacked');
      const stack = this._attr.stack;

      if (isHistogram) stack.out(self._stackMixedValues(data.series.length));

      return stack(data.series.map(function (d) {
        const label = d.label;
        return d.values.map(function (e, i) {
          return {
            _input: e,
            label: label,
            x: self._attr.xValue.call(d.values, e, i),
            y: self._attr.yValue.call(d.values, e, i)
          };
        });
      }));
    };


    validateDataCompliesWithScalingMethod(data) {
      const valuesSmallerThanOne = function (d) {
        return d.values && d.values.some(e => e.y < 1);
      };

      const invalidLogScale = data.series && data.series.some(valuesSmallerThanOne);
      if (this._attr.scale === 'log' && invalidLogScale) {
        throw new errors.InvalidLogScaleValues();
      }
    };

    /**
     * Creates rects to show buckets outside of the ordered.min and max, returns rects
     *
     * @param xScale {Function} D3 xScale function
     * @param svg {HTMLElement} Reference to SVG
     * @method createEndZones
     * @returns {D3.Selection}
     */
    createEndZones(svg) {
      const self = this;
      const xAxis = this.handler.xAxis;
      const xScale = xAxis.xScale;
      const ordered = xAxis.ordered;
      const missingMinMax = !ordered || _.isUndefined(ordered.min) || _.isUndefined(ordered.max);

      if (missingMinMax || ordered.endzones === false) return;

      const attr = this.handler._attr;
      const height = attr.height;
      const width = attr.width;
      const margin = attr.margin;

      // we don't want to draw endzones over our min and max values, they
      // are still a part of the dataset. We want to start the endzones just
      // outside of them so we will use these values rather than ordered.min/max
      const oneUnit = (ordered.units || _.identity)(1);

      // points on this axis represent the amount of time they cover,
      // so draw the endzones at the actual time bounds
      const leftEndzone = {
        x: 0,
        w: Math.max(xScale(ordered.min), 0)
      };

      const rightLastVal = xAxis.expandLastBucket ? ordered.max : Math.min(ordered.max, _.last(xAxis.xValues));
      const rightStart = rightLastVal + oneUnit;
      const rightEndzone = {
        x: xScale(rightStart),
        w: Math.max(width - xScale(rightStart), 0)
      };

      this.endzones = svg.selectAll('.layer')
      .data([leftEndzone, rightEndzone])
      .enter()
      .insert('g', '.brush')
      .attr('class', 'endzone')
      .append('rect')
      .attr('class', 'zone')
      .attr('x', function (d) {
        return d.x;
      })
      .attr('y', 0)
      .attr('height', height - margin.top - margin.bottom)
      .attr('width', function (d) {
        return d.w;
      });

      function callPlay(event) {
        const boundData = event.target.__data__;
        const mouseChartXCoord = event.clientX - self.chartEl.getBoundingClientRect().left;
        const wholeBucket = boundData && boundData.x != null;

        // the min and max that the endzones start in
        const min = leftEndzone.w;
        const max = rightEndzone.x;

        // bounds of the cursor to consider
        let xLeft = mouseChartXCoord;
        let xRight = mouseChartXCoord;
        if (wholeBucket) {
          xLeft = xScale(boundData.x);
          xRight = xScale(xAxis.addInterval(boundData.x));
        }

        return {
          wholeBucket: wholeBucket,
          touchdown: min > xLeft || max < xRight
        };
      }

      function textFormatter() {
        return touchdownTmpl(callPlay(d3.event));
      }

      const endzoneTT = new Tooltip('endzones', this.handler.el, textFormatter, null);
      this.tooltips.push(endzoneTT);
      endzoneTT.order = 0;
      endzoneTT.showCondition = function inEndzone() {
        return callPlay(d3.event).touchdown;
      };
      endzoneTT.render()(svg);
    };
  }

  return PointSeriesChart;
};
