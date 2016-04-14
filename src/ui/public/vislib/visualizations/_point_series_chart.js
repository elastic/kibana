define(function (require) {
  return function PointSeriesChartProvider(Private) {
    let d3 = require('d3');
    let _ = require('lodash');

    let Chart = Private(require('ui/vislib/visualizations/_chart'));
    let Tooltip = Private(require('ui/vislib/components/Tooltip'));
    let touchdownTmpl = _.template(require('ui/vislib/partials/touchdown.tmpl.html'));

    _.class(PointSeriesChart).inherits(Chart);
    function PointSeriesChart(handler, chartEl, chartData) {
      if (!(this instanceof PointSeriesChart)) {
        return new PointSeriesChart(handler, chartEl, chartData);
      }

      PointSeriesChart.Super.apply(this, arguments);
    }

    PointSeriesChart.prototype._stackMixedValues = function (stackCount) {
      let currentStackOffsets = [0, 0];
      let currentStackIndex = 0;

      return function (d, y0, y) {
        let firstStack = currentStackIndex % stackCount === 0;
        let lastStack = ++currentStackIndex === stackCount;

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
    PointSeriesChart.prototype.stackData = function (data) {
      let self = this;
      let isHistogram = (this._attr.type === 'histogram' && this._attr.mode === 'stacked');
      let stack = this._attr.stack;

      if (isHistogram) stack.out(self._stackMixedValues(data.series.length));

      return stack(data.series.map(function (d) {
        let label = d.label;
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

    PointSeriesChart.prototype._invalidLogScaleValues = function (data) {
      return data.series && data.series.some(function (d) {
        return d.values && d.values.some(function (e) {
          return e.y < 1;
        });
      });
    };

    /**
     * Creates rects to show buckets outside of the ordered.min and max, returns rects
     *
     * @param xScale {Function} D3 xScale function
     * @param svg {HTMLElement} Reference to SVG
     * @method createEndZones
     * @returns {D3.Selection}
     */
    PointSeriesChart.prototype.createEndZones = function (svg) {
      let self = this;
      let xAxis = this.handler.xAxis;
      let xScale = xAxis.xScale;
      let ordered = xAxis.ordered;
      let missingMinMax = !ordered || _.isUndefined(ordered.min) || _.isUndefined(ordered.max);

      if (missingMinMax || ordered.endzones === false) return;

      let attr = this.handler._attr;
      let height = attr.height;
      let width = attr.width;
      let margin = attr.margin;
      let color = '#004c99';

      // we don't want to draw endzones over our min and max values, they
      // are still a part of the dataset. We want to start the endzones just
      // outside of them so we will use these values rather than ordered.min/max
      let oneUnit = (ordered.units || _.identity)(1);
      let beyondMin = ordered.min - oneUnit;
      let beyondMax = ordered.max + oneUnit;

      // points on this axis represent the amount of time they cover,
      // so draw the endzones at the actual time bounds
      let leftEndzone = {
        x: 0,
        w: Math.max(xScale(ordered.min), 0)
      };

      let rightLastVal = xAxis.expandLastBucket ? ordered.max : Math.min(ordered.max, _.last(xAxis.xValues));
      let rightStart = rightLastVal + oneUnit;
      let rightEndzone = {
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
        let boundData = event.target.__data__;
        let mouseChartXCoord = event.clientX - self.chartEl.getBoundingClientRect().left;
        let wholeBucket = boundData && boundData.x != null;

        // the min and max that the endzones start in
        let min = leftEndzone.w;
        let max = rightEndzone.x;

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

      let endzoneTT = new Tooltip('endzones', this.handler.el, textFormatter, null);
      this.tooltips.push(endzoneTT);
      endzoneTT.order = 0;
      endzoneTT.showCondition = function inEndzone() {
        return callPlay(d3.event).touchdown;
      };
      endzoneTT.render()(svg);
    };

    return PointSeriesChart;
  };
});
