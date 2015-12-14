define(function (require) {
  return function VislibVisTypeFactory(Private) {
    var _ = require('lodash');

    require('ui/vislib');
    var VisTypeSchemas = Private(require('ui/Vis/Schemas'));
    var VisType = Private(require('ui/Vis/VisType'));
    var pointSeries = Private(require('ui/agg_response/point_series/point_series'));
    var VislibRenderbot = Private(require('ui/vislib_vis_type/VislibRenderbot'));

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
