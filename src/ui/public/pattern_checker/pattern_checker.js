import uiModules from 'ui/modules';
import template from './pattern_checker.html';
import './pattern_checker.less';

const module = uiModules.get('kibana');

module.directive('patternChecker', function () {
  return {
    restrict: 'E',
    template: template,
    controllerAs: 'checker',
    bindToController: true,
    scope: {
      pattern: '=',
      buttonLabel: '='
    },
    controller: function (es, Notifier, $scope, $timeout) {
      let validationTimeout;

      var notify = new Notifier({
        location: 'Add Data'
      });

      this.validateInstall = () => {
        es.count({
          index: this.pattern
        })
        .then(
          (response) => {
            this.validationResults = `Querying ${this.pattern}... ${response.count} results`;
            this.isValidated = !!response.count;
          },
          (error) => {
            notify.fatal(error);
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

