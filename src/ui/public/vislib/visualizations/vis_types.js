import VislibVisualizationsPointSeriesProvider from './point_series';
import VislibVisualizationsPieChartProvider from './pie_chart';
import VislibVisualizationsTileMapProvider from './tile_map';

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
    tile_map: Private(VislibVisualizationsTileMapProvider),
    point_series: Private(VislibVisualizationsPointSeriesProvider)
  };
};
