define(function (require) {
  var module = require('ui/modules').get('kibana/vislib', ['kibana']);

  // prefetched for faster optimization runs
  require('ui/vislib/lib/handler/types/pie');
  require('ui/vislib/lib/handler/types/point_series');
  require('ui/vislib/lib/handler/types/tile_map');
  require('ui/vislib/lib/handler/handler_types');
  require('ui/vislib/lib/layout/layout_types');
  require('ui/vislib/lib/data');
  require('ui/vislib/visualizations/_map.js');
  require('ui/vislib/visualizations/vis_types');
  // end prefetching

  module.service('d3', function () {
    return require('d3');
  });

  /**
   * Provides the Kibana4 Visualization Library
   *
   * @module vislib
   * @main vislib
   * @return {Object} Contains the version number and the Vis Class for creating visualizations
   */
  module.service('vislib', function (Private) {
    return {
      version: '0.0.0',
      Vis: Private(require('ui/vislib/vis'))
    };
  });
});
