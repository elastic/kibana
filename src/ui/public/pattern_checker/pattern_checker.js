import { uiModules } from 'ui/modules';
import template from './pattern_checker.html';
import './pattern_checker.less';
import chrome from 'ui/chrome';

const module = uiModules.get('kibana');

module.directive('patternChecker', function () {
  return {
    restrict: 'E',
    template: template,
    controllerAs: 'checker',
    bindToController: true,
    scope: {
      pattern: '='
    },
    controller: function (Notifier, $scope, $timeout, $http) {
      let validationTimeout;

      const notify = new Notifier({
        location: 'Add Data'
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
              notify.fatal(error);
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
    }
  };
});

