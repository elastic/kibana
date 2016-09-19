import 'ui/vislib/lib/types/pie';
import 'ui/vislib/lib/types/point_series';
import 'ui/vislib/lib/types/tile_map';
import 'ui/vislib/lib/types';
import 'ui/vislib/lib/layout/layout_types';
import 'ui/vislib/lib/data';
import 'ui/vislib/visualizations/_map.js';
import 'ui/vislib/visualizations/vis_types';
import 'ui/vislib/styles/main.less';
import VislibVisProvider from 'ui/vislib/vis';
// prefetched for faster optimization runs
// end prefetching

/**
 * Provides the Kibana4 Visualization Library
 *
 * @module vislib
 * @main vislib
 * @return {Object} Contains the version number and the Vis Class for creating visualizations
 */
module.exports = function VislibProvider(Private) {

  return {
    version: '0.0.0',
    Vis: Private(VislibVisProvider)
  };
};
