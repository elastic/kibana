import _ from 'lodash';
import { InvalidLogScaleValues } from 'ui/errors';

export function VislibVisualizationsPointSeriesProvider() {

  class PointSeries {
    constructor(handler, seriesEl, seriesData, seriesConfig) {
      this.handler = handler;
      this.baseChart = handler.pointSeries;
      this.chartEl = seriesEl;
      this.chartData = seriesData;
      this.seriesConfig = seriesConfig;

      this.validateDataCompliesWithScalingMethod(this.chartData);
    }

    validateDataCompliesWithScalingMethod(data) {
      const invalidLogScale = data.values && data.values.some(d => d.y < 1);
      if (this.getValueAxis().axisConfig.isLogScale() && invalidLogScale) {
        throw new InvalidLogScaleValues();
      }
    }

    getStackedCount() {
      return this.baseChart.chartConfig.series.reduce(function (sum, series) {
        return series.mode === 'stacked' ? sum + 1 : sum;
      }, 0);
    }

    getGroupedCount() {
      const stacks = [];
      return this.baseChart.chartConfig.series.reduce((sum, series) => {
        const valueAxis = series.valueAxis || this.baseChart.handler.valueAxes[0].id;
        const isStacked = series.mode === 'stacked';
        const isHistogram = series.type === 'histogram';
        if (!isHistogram) return sum;
        if (isStacked && stacks.includes(valueAxis)) return sum;
        if (isStacked) stacks.push(valueAxis);
        return sum + 1;
      }, 0);
    }

    getStackedNum(data) {
      let i = 0;
      for (const seri of this.baseChart.chartConfig.series) {
        if (seri.data === data) return i;
        if (seri.mode === 'stacked') i++;
      }
      return 0;
    }

    getGroupedNum(data) {
      let i = 0;
      const stacks = [];
      for (const seri of this.baseChart.chartConfig.series) {
        const valueAxis = seri.valueAxis || this.baseChart.handler.valueAxes[0].id;
        const isStacked = seri.mode === 'stacked';
        if (!isStacked) {
          if (seri.data === data) return i;
          i++;
        } else {
          if (!(valueAxis in stacks)) stacks[valueAxis] = i++;
          if (seri.data === data) return stacks[valueAxis];
        }
      }
      return 0;
    }

    getValueAxis() {
      return _.find(this.handler.valueAxes, axis => {
        return axis.axisConfig.get('id') === this.seriesConfig.valueAxis;
      }) || this.handler.valueAxes[0];
    }

    getCategoryAxis() {
      return _.find(this.handler.categoryAxes, axis => {
        return axis.axisConfig.get('id') === this.seriesConfig.categoryAxis;
      }) || this.handler.categoryAxes[0];
    }

    addCircleEvents(element) {
      const events = this.events;
      if (this.handler.visConfig.get('enableHover')) {
        const hover = events.addHoverEvent();
        const mouseout = events.addMouseoutEvent();
        element.call(hover).call(mouseout);
      }
      const click = events.addClickEvent();
      return element.call(click);
    }
  }

  return PointSeries;
}
