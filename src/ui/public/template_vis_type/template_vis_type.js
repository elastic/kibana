import _ from 'lodash';
import VisVisTypeProvider from 'ui/vis/vis_type';
import TemplateVisTypeTemplateRenderbotProvider from 'ui/template_vis_type/template_renderbot';
export default function TemplateVisTypeFactory(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateRenderbot = Private(TemplateVisTypeTemplateRenderbotProvider);

  _.class(TemplateVisType).inherits(VisType);
  function TemplateVisType(opts = {}) {
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
}
