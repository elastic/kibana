import $ from 'jquery';
import { uiModules } from 'ui/modules';

uiModules
  .get('kibana')
  .directive('visEditorResizer', function () {
    return {
      restrict: 'E',
      link: function ($scope, $el) {
        $el.on('mousedown', function (event) {
          const $left = $('.collapsible-sidebar');

          $el.addClass('active');
          const startWidth = $left.width();
          const startX = event.pageX;

          function onMove(event) {
            const newWidth = startWidth + event.pageX - startX;
            if (newWidth > 360) {
              $left.width(startWidth + event.pageX - startX);
            }
          }

          $(document.body)
            .on('mousemove', onMove)
            .one('mouseup', function () {
              $el.removeClass('active');
              $(this).off('mousemove', onMove);
              $scope.$broadcast('render');
            });
        });
      }
    };
  });
