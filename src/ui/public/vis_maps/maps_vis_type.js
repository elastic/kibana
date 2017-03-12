import _ from 'lodash';
import 'ui/vislib';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import VisVisTypeProvider from 'ui/vis/vis_type';
import MapsVisTypeMapsRenderbotProvider from 'ui/vis_maps/maps_renderbot';
export default function MapsVisTypeFactory(Private) {
  const VisType = Private(VisVisTypeProvider);
  const MapsRenderbot = Private(MapsVisTypeMapsRenderbotProvider);

  _.class(MapsVisType).inherits(VisType);
  function MapsVisType(opts = {}) {
    MapsVisType.Super.call(this, opts);
    this.listeners = opts.listeners || {};
  }

  MapsVisType.prototype.createRenderbot = function (vis, $el, uiState) {
    return new MapsRenderbot(vis, $el, uiState);
  };

  return MapsVisType;
}
