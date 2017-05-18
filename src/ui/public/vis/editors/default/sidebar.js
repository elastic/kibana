import './agg_group';
import './vis_options';
import { uiModules } from 'ui/modules';
import sidebarTemplate from './sidebar.html';

uiModules
.get('app/visualize')
.directive('visEditorSidebar', function () {


  return {
    restrict: 'E',
    template: sidebarTemplate,
    scope: true,
    controllerAs: 'sidebar',
    controller: function ($scope) {

      $scope.$watch('vis.type', (visType) => {
        if (visType) {
          this.showData = visType.schemas.buckets || visType.schemas.metrics;
          this.section = this.section || (this.showData ? 'data' : 'options');
        }
      });
    }
  };
});
