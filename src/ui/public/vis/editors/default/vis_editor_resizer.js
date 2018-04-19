import $ from 'jquery';
import { uiModules } from '../../../modules';
import { keyCodes } from '@elastic/eui';

uiModules
  .get('kibana')
  .directive('visEditorResizer', function () {
    return {
      restrict: 'E',
      link: function ($scope, $el) {
        const $left = $el.parent();

        $el.on('mousedown', function (event) {
          $el.addClass('active');
          const startWidth = $left.width();
          const startX = event.pageX;

          function onMove(event) {
            const newWidth = startWidth + event.pageX - startX;
            $left.width(newWidth);
          }

          $(document.body)
            .on('mousemove', onMove)
            .one('mouseup', () => {
              $el.removeClass('active');
              $(document.body).off('mousemove', onMove);
              $scope.$broadcast('render');
            });
        });

        $el.on('keydown', event => {
          const { keyCode } = event;

          if (keyCode === keyCodes.LEFT || keyCode === keyCodes.RIGHT) {
            event.preventDefault();
            const startWidth = $left.width();
            const newWidth = startWidth + (keyCode === keyCodes.LEFT ? -15 : 15);
            $left.width(newWidth);
            $scope.$broadcast('render');
          }
        });
      }
    };
  });
