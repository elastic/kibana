define(function (require) {
  return function VislibVisTypeFactory(Private) {
    let _ = require('lodash');

    require('ui/vislib');
    let VisTypeSchemas = Private(require('ui/Vis/Schemas'));
    let VisType = Private(require('ui/Vis/VisType'));
    let pointSeries = Private(require('ui/agg_response/point_series/point_series'));
    let VislibRenderbot = Private(require('ui/vislib_vis_type/VislibRenderbot'));

    require('plugins/kbn_vislib_vis_types/controls/vislib_basic_options');
    require('plugins/kbn_vislib_vis_types/controls/point_series_options');
    require('plugins/kbn_vislib_vis_types/controls/line_interpolation_option');

    _.class(VislibVisType).inherits(VisType);
    function VislibVisType(opts) {
      opts = opts || {};

      VislibVisType.Super.call(this, opts);

      if (this.responseConverter == null) {
        this.responseConverter = pointSeries;
      }

      this.listeners = opts.listeners || {};
    }

    VislibVisType.prototype.createRenderbot = function (vis, $el, uiState) {
      return new VislibRenderbot(vis, $el, uiState);
    };

    return VislibVisType;
  };
});
