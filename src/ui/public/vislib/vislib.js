import './lib/types/pie';
import './lib/types/point_series';
import './lib/types';
import './lib/layout/layout_types';
import './lib/data';
import './visualizations/vis_types';
import './styles/main.less';
import VislibVisProvider from './vis';
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
