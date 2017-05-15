import { VisVisTypeProvider } from 'ui/vis/vis_type';

export function TemplateVisTypeProvider(Private, $compile, $rootScope) {
  const VisType = Private(VisVisTypeProvider);

  class TemplateVisType extends VisType {
    constructor(opts) {
      super(opts);

      this.visConfig.template = opts.visConfig ? opts.visConfig.template : opts.template;
      if (!this.visConfig.template) {
        throw new Error('Missing template for TemplateVisType');
      }
    }

    render(vis, $el, uiState, esResponse) {
      return new Promise((resolve, reject) => {
        if (!this.$scope) {
          this.$scope = $rootScope.$new();
          this.$scope.uiState = uiState;
          $el.html($compile(vis.type.visConfig.template)(this.$scope));
        }

        this.$scope.vis = vis.clone();
        this.$scope.esResponse = esResponse;
        this.$scope.renderComplete = resolve;
        this.$scope.renderFailed = reject;
      });
    }

    destroy() {
      this.$scope.$destroy();
      this.$scope = null;
    }
  }

  return TemplateVisType;
}
