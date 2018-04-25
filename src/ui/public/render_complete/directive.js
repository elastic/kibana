import { uiModules } from '../modules';

const attributeName = 'data-render-complete';

uiModules
  .get('kibana')
  .directive('renderComplete', () => ({
    controller($scope, $element) {
      const el = $element[0];

      const start = () => {
        $element.attr(attributeName, false);
        return true;
      };

      const complete = () => {
        $element.attr(attributeName, true);
        return true;
      };

      const teardown = () => {
        el.removeEventListener('renderStart', start);
        el.removeEventListener('renderComplete', complete);
      };

      const setup = () => {
        $element.attr(attributeName, false);
        el.addEventListener('renderStart', start);
        el.addEventListener('renderComplete', complete);
        $scope.$on('$destroy', teardown);
      };

      this.disable = () => {
        $element.attr(attributeName, 'disabled');
        teardown();
      };

      setup();
    }
  }));
