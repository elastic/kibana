import _ from 'lodash';
import './agg_group';
import './vis_options';
import { uiModules } from '../../../modules';
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
            if (_.has(visType, 'editorConfig.optionTabs')) {
              const activeTabs = visType.editorConfig.optionTabs.filter((tab) => {
                return _.get(tab, 'active', false);
              });
              if (activeTabs.length > 0) {
                this.section = activeTabs[0].name;
              }
            }
            this.section = this.section || (this.showData ? 'data' : _.get(visType, 'editorConfig.optionTabs[0].name'));
          }
        });
      }
    };
  });
