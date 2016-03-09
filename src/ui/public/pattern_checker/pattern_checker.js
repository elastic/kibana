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
      this.isValidating = false;

      var notify = new Notifier({
        location: 'Add Data'
      });

      this.toggleValidation = () => {
        if (!this.isValidating) {
          this.isValidating = true;
          this.validateInstall();
        }
        else {
          $timeout.cancel(validationTimeout);
          this.isValidating = false;
          this.validationResults = '';
        }
      };

      this.validateInstall = () => {
        es.count({
          index: this.pattern
        })
        .then(
          (response) => {
            this.validationResults = `Querying ${this.pattern}... ${response.count} results`;
          },
          (error) => {
            notify.fatal(error);
          }
        )
        .then(() => {
          validationTimeout = $timeout(this.validateInstall, 5000);
        });
      };
    }
  };
});

