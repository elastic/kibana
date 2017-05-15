import 'ui/vislib';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import { VisVisTypeProvider } from 'ui/vis/vis_type';
import MapsVisTypeMapsRenderbotProvider from 'ui/vis_maps/maps_renderbot';

export function MapsVisTypeProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const MapsRenderbot = Private(MapsVisTypeMapsRenderbotProvider);

  class MapsVisType extends VisType {
    constructor(opts) {
      if (!opts.responseHandler) {
        opts.responseHandler = 'basic';
      }
      super(opts);
    }

    render(vis, $el, uiState, esResponse) {
      return new Promise(resolve => {
        if (!this.renderbot) {
          this.renderbot = new MapsRenderbot(vis, $el, uiState);
        }
        this.renderbot.render(esResponse);
        resolve();
      });
    }

    destroy() {
      this.renderbot.destroy();
    }
  }

  return MapsVisType;
}
