import VislibVisualizationsPointSeriesProvider from './point_series';
import VislibVisualizationsPieChartProvider from './pie_chart';

export default function VisTypeFactory(Private) {

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
    point_series: Private(VislibVisualizationsPointSeriesProvider)
  };
}
