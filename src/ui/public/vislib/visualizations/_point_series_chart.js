import d3 from 'd3';
import _ from 'lodash';
import ChartProvider from 'ui/vislib/visualizations/_chart';
import TooltipProvider from 'ui/vislib/components/tooltip';
import errors from 'ui/errors';

export default function PointSeriesChartProvider(Private) {

  const Chart = Private(ChartProvider);
  const Tooltip = Private(TooltipProvider);
  const touchdownTmpl = _.template(require('ui/vislib/partials/touchdown.tmpl.html'));

  class PointSeriesChart extends Chart {
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);
    }

    getStackedCount() {
      return _.reduce(this.handler.data.data.series, function (sum, val) {
        if (val.stacked || 1) return sum + 1;
      }, 0);
    };

    getStackedNum(data) {
      let i = 0;
      for (const seri of this.handler.data.data.series) {
        if (seri === data) return i;
        if (seri.stacked || 1) i++;
      }
      return 0;
    };

    getValueAxis() {
      return _.find(this.handler.valueAxes, axis => {
        return axis.id === this._attr.valueAxis;
      }) || this.handler.valueAxes[0];
    };

    getCategoryAxis() {
      return _.find(this.handler.categoryAxes, axis => {
        return axis.id === this._attr.categoryAxis;
      }) || this.handler.categoryAxes[0];
    };

    addCircleEvents(element) {
      const events = this.events;
      const hover = events.addHoverEvent();
      const mouseout = events.addMouseoutEvent();
      const click = events.addClickEvent();
      return element.call(hover).call(mouseout).call(click);
    };

    createEndZones(svg) {
      const self = this;
      const xAxis = this.handler.categoryAxes[0];
      const xScale = xAxis.getScale();
      const ordered = xAxis.ordered;
      const missingMinMax = !ordered || _.isUndefined(ordered.min) || _.isUndefined(ordered.max);

      if (missingMinMax || ordered.endzones === false) return;

      const attr = this.handler._attr;
      const {width, height} = svg.node().getBBox();
      const margin = attr.get('style.margin');

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

      const rightLastVal = xAxis.expandLastBucket ? ordered.max : Math.min(ordered.max, _.last(xAxis.values));
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
