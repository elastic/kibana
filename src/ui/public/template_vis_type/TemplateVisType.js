define(function (require) {
  return function TemplateVisTypeFactory(Private) {
    let _ = require('lodash');
    let VisType = Private(require('ui/Vis/VisType'));
    let TemplateRenderbot = Private(require('ui/template_vis_type/TemplateRenderbot'));

    _.class(TemplateVisType).inherits(VisType);
    function TemplateVisType(opts) {
      TemplateVisType.Super.call(this, opts);

      this.template = opts.template;
      if (!this.template) {
        throw new Error('Missing template for TemplateVisType');
      }
    }

    TemplateVisType.prototype.createRenderbot = function (vis, $el, uiState) {
      return new TemplateRenderbot(vis, $el, uiState);
    };

    return TemplateVisType;
  };
});
