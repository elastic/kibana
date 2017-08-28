import { VisTypeProvider } from 'ui/vis/vis_types';
import $ from 'jquery';


export function AngularVisTypeProvider(Private, $compile, $rootScope) {
  const VisType = Private(VisTypeProvider);

  class AngularVisController {
    constructor(domeElement, vis) {
      this.el = $(domeElement);
      this.vis = vis;
    }

    render(esResponse) {

      return new Promise((resolve, reject) => {
        const updateScope = () => {
          this.$scope.vis = this.vis.clone();
          this.$scope.vis.setUiState(this.vis.getUiState());
          this.$scope.esResponse = esResponse;
          this.$scope.renderComplete = resolve;
          this.$scope.renderFailed = reject;
          this.$scope.resize = Date.now();
          this.$scope.$apply();
        };

        if (!this.$scope) {
          this.$scope = $rootScope.$new();
          updateScope();
          this.$scope.uiState = this.vis.getUiState();
          this.el.html($compile(this.vis.type.visConfig.template)(this.$scope));
        } else {
          updateScope();
        }
      });
    }

    destroy() {
      if (this.$scope) {
        this.$scope.$destroy();
        this.$scope = null;
      }
    }
  }

  class AngularVisType extends VisType {
    constructor(opts) {
      opts.visualization = AngularVisController;

      super(opts);

      this.visConfig.template = opts.visConfig ? opts.visConfig.template : opts.template;
      if (!this.visConfig.template) {
        throw new Error('Missing template for AngularVisType');
      }
    }
  }

  return AngularVisType;
}
