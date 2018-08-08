/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
