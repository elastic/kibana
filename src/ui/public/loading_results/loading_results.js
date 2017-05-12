import { uiModules } from 'ui/modules';
import template from './loading_results.html';

const app = uiModules.get('xpack/watcher');

app.directive('loadingResults', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      resultsName: '@',
    },
    controllerAs: 'loadingResults',
    bindToController: true,
    controller: class LoadingResultsController {
      constructor() {
        this.resultsName = this.resultsName || 'items';
      }
    }
  };
});
