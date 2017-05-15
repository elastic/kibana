import 'ui/vislib';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import { VisTypeFactoryProvider } from 'ui/vis/vis_type';
import MapsVisTypeMapsRenderbotProvider from 'ui/vis_maps/maps_renderbot';

export function MapsVisTypeFactoryProvider(Private) {
  const VisTypeFactory = Private(VisTypeFactoryProvider);
  const MapsRenderbot = Private(MapsVisTypeMapsRenderbotProvider);

  class MapsVisTypeFactory extends VisTypeFactory {
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

  return MapsVisTypeFactory;
}
