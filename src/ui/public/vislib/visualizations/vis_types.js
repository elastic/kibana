import VislibVisualizationsColumnChartProvider from 'ui/vislib/visualizations/column_chart';
import VislibVisualizationsPieChartProvider from 'ui/vislib/visualizations/pie_chart';
import VislibVisualizationsLineChartProvider from 'ui/vislib/visualizations/line_chart';
import VislibVisualizationsAreaChartProvider from 'ui/vislib/visualizations/area_chart';
import VislibVisualizationsTileMapProvider from 'ui/vislib/visualizations/tile_map';

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
    histogram: Private(VislibVisualizationsColumnChartProvider),
    pie: Private(VislibVisualizationsPieChartProvider),
    line: Private(VislibVisualizationsLineChartProvider),
    area: Private(VislibVisualizationsAreaChartProvider),
    tile_map: Private(VislibVisualizationsTileMapProvider)
  };
};
