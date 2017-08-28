import { VislibTypesPointSeries } from './point_series';
import { VislibPieConfigProvider } from './pie';
import { vislibGaugeProvider } from './gauge';

export function VislibTypesProvider(Private) {
  const pointSeries = Private(VislibTypesPointSeries);

  /**
   * Handles the building of each visualization
   *
   * @return {Function} Returns an Object of Handler types
   */
  return {
    histogram: pointSeries.column,
    horizontal_bar: pointSeries.column,
    line: pointSeries.line,
    pie: Private(VislibPieConfigProvider),
    area: pointSeries.area,
    point_series: pointSeries.line,
    heatmap: pointSeries.heatmap,
    gauge: Private(vislibGaugeProvider),
    goal: Private(vislibGaugeProvider),
    metric: Private(vislibGaugeProvider)
  };
}
