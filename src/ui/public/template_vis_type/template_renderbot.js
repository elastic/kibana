import _ from 'lodash';
import VisRenderbotProvider from 'ui/vis/renderbot';
export default function TemplateRenderbotFactory(Private, $compile, $rootScope) {
  let Renderbot = Private(VisRenderbotProvider);

  _.class(TemplateRenderbot).inherits(Renderbot);
  function TemplateRenderbot(vis, $el, uiState) {
    TemplateRenderbot.Super.call(this, vis, $el, uiState);

    this.$scope = $rootScope.$new();
    this.$scope.vis = vis;

    $el.html($compile(this.vis.type.template)(this.$scope));
  }

  TemplateRenderbot.prototype.render = function (esResponse) {
    this.$scope.esResponse = esResponse;
  };

  TemplateRenderbot.prototype.destroy = function () {
    this.$scope.$destroy();
  };

  return TemplateRenderbot;
};
