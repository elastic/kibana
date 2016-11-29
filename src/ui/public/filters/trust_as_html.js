import angular from 'angular';
import uiModules from 'ui/modules';
let module = uiModules.get('kibana');

// Simple filter to allow using ng-bind-html without explicitly calling $sce.trustAsHtml in a controller
// (See http://goo.gl/mpj9o2)
module.filter('trustAsHtml', function ($sce) {
  return $sce.trustAsHtml;
});
