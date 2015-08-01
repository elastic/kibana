define(function (require) {
  return function VisTypeFactory(Private) {

    /**
     * Provides the visualizations for the vislib
     *
     * @module vislib
     * @submodule VisTypeFactory
     * @param Private {Object} Loads any function as an angular module
     * @return {Function} Returns an Object of Visualization classes
     */
    return {
      histogram: Private(require('ui/vislib/visualizations/column_chart')),
      pie: Private(require('ui/vislib/visualizations/pie_chart')),
      line: Private(require('ui/vislib/visualizations/line_chart')),
      area: Private(require('ui/vislib/visualizations/area_chart')),
      tile_map: Private(require('ui/vislib/visualizations/tile_map'))
    };
  };
});
