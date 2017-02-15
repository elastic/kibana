import VislibLibTypesPointSeriesProvider from './point_series';
import VislibLibTypesPieProvider from './pie';

export default function TypeFactory(Private) {
  const pointSeries = Private(VislibLibTypesPointSeriesProvider);

  /**
   * Handles the building of each visualization
   *
   * @return {Function} Returns an Object of Handler types
   */
  return {
    histogram: pointSeries.column,
    horizontal_bar: pointSeries.column,
    line: pointSeries.line,
    pie: Private(VislibLibTypesPieProvider),
    area: pointSeries.area,
    point_series: pointSeries.line,
    heatmap: pointSeries.heatmap,
  };
}
