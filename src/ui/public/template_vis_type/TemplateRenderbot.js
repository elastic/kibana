define(function (require) {
  return function TemplateRenderbotFactory(Private, $compile, $rootScope) {
    let _ = require('lodash');
    let Renderbot = Private(require('ui/Vis/Renderbot'));

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
});
