/**
 * The keyboardMove directive can be attached to elements, that can receive keydown events.
 * It will call the passed callback function and pass the direction in which an
 * arrow key was pressed to the callback (as the argument with the name `direction`).
 * The passed value will be one of `Direction.up` or `Direction.down`, which can be
 * imported to compare against those values. The directive will also make sure, that
 * the pressed button will get the focus back (e.g. if it was lost due to a ng-repeat
 * reordering).
 *
 * Usage example:
 *
 * <button keyboard-move="onMoved(direction)">...</button>
 *
 * import { Direction } from './keyboard_move';
 * function onMoved(dir) {
 *   if (dir === Direction.up) {
 *     // moved up
 *   } else if (dir === Direction.down) {
 *     // moved down
 *   }
 * }
 */
import { uiModules } from '../../../modules';
import { keyCodes } from '@elastic/eui';

export const Direction = {
  up: 'up',
  down: 'down'
};

const directionMapping = {
  [keyCodes.UP]: Direction.up,
  [keyCodes.DOWN]: Direction.down
};

uiModules.get('kibana')
  .directive('keyboardMove', ($parse, $timeout) => ({
    restrict: 'A',
    link(scope, el, attr) {
      const callbackFn = $parse(attr.keyboardMove);
      el.keydown((ev) => {
        if (ev.which in directionMapping) {
          ev.preventDefault();
          const direction = directionMapping[ev.which];
          scope.$apply(() => callbackFn(scope, { direction }));
          // Keep focus on that element, even though it might be attached somewhere
          // else in the DOM (e.g. because it has a new position in an ng-repeat).
          $timeout(() => el.focus());
        }
      });

      scope.$on('$destroy', () => {
        el.off('keydown');
      });
    }
  }));
