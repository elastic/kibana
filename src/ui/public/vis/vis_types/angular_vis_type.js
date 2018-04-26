import { VisTypeProvider } from './';
import $ from 'jquery';


export function AngularVisTypeProvider(Private, $compile, $rootScope) {
  const VisType = Private(VisTypeProvider);

  class AngularVisController {
    constructor(domeElement, vis) {
      this.el = $(domeElement);
      this.vis = vis;
    }

    render(esResponse, status) {

      return new Promise((resolve, reject) => {
        const updateScope = () => {
          this.$scope.vis = this.vis;
          this.$scope.visState = this.vis.getState();
          this.$scope.esResponse = esResponse;
          this.$scope.renderComplete = resolve;
          this.$scope.renderFailed = reject;
          this.$scope.resize = Date.now();
          this.$scope.updateStatus = status;
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
