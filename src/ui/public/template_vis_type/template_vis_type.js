import _ from 'lodash';
import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { TemplateRenderbotProvider } from 'ui/template_vis_type/template_renderbot';

export function TemplateVisTypeProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateRenderbot = Private(TemplateRenderbotProvider);

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

