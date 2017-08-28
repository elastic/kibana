import { VislibVisualizationsPointSeriesProvider } from './point_series';
import { VislibVisualizationsPieChartProvider } from './pie_chart';
import { GaugeChartProvider } from './gauge_chart';

export function VislibVisualizationsVisTypesProvider(Private) {

  /**
   * Provides the visualizations for the vislib
   *
   * @module vislib
   * @submodule VisTypeFactory
   * @param Private {Object} Loads any function as an angular module
   * @return {Function} Returns an Object of Visualization classes
   */
  return {
    pie: Private(VislibVisualizationsPieChartProvider),
    point_series: Private(VislibVisualizationsPointSeriesProvider),
    gauge: Private(GaugeChartProvider),
    goal: Private(GaugeChartProvider),
    metric: Private(GaugeChartProvider)
  };
}
