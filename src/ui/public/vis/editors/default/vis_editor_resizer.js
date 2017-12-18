import $ from 'jquery';
import { uiModules } from 'ui/modules';
import { keyCodes } from 'ui_framework/services';

uiModules
  .get('kibana')
  .directive('visEditorResizer', function () {
    return {
      restrict: 'E',
      link: function ($scope, $el) {
        let $left;
        const minWidth = 360;

        $el.on('mousedown', function (event) {
          if (!$left) {
            $left = $('.collapsible-sidebar');
          }

          $el.addClass('active');
          const startWidth = $left.width();
          const startX = event.pageX;

          function onMove(event) {
            const newWidth = startWidth + event.pageX - startX;
            if (newWidth > minWidth) {
              $left.width(startWidth + event.pageX - startX);
            }
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

          if (!$left) {
            $left = $('.collapsible-sidebar');
          }

          if (keyCode === keyCodes.LEFT || keyCode === keyCodes.RIGHT) {
            event.preventDefault();
            const startWidth = $left.width();
            const newWidth = startWidth + (keyCode === keyCodes.LEFT ? -15 : 15);
            if (newWidth > minWidth) {
              $left.width(newWidth);
              $scope.$broadcast('render');
            }
          }
        });
      }
    };
  });
