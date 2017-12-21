import { uiModules } from 'ui/modules';
import { fatalError } from 'ui/notify';
import { callAfterBindingsWorkaround } from 'ui/compat';
import template from './pattern_checker.html';
import './pattern_checker.less';
import chrome from 'ui/chrome';

const module = uiModules.get('kibana');
const location = 'Add Data';

module.directive('patternChecker', function () {
  return {
    restrict: 'E',
    template: template,
    controllerAs: 'checker',
    bindToController: true,
    scope: {
      pattern: '='
    },
    controller: callAfterBindingsWorkaround(function (Notifier, $scope, $timeout, $http) {
      let validationTimeout;

      const notify = new Notifier({
        location,
      });

      this.validateInstall = () => {
        $http.post(chrome.addBasePath(`/api/kibana/${this.pattern}/_count`))
          .then(
            (response) => {
              this.resultCount = response.data.count;
            },
            (error) => {
              if (error.status === 404) {
                this.resultCount = 0;
              }
              else {
                fatalError(error, location);
              }
            }
          )
          .then(() => {
            validationTimeout = $timeout(this.validateInstall, 5000);
          });
      };

      $scope.$on('$destroy', () => {
        $timeout.cancel(validationTimeout);
      });

      this.validateInstall();
    })
  };
});
