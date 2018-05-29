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

import template from './typeahead.html';
import { uiModules } from '../modules';
import { comboBoxKeyCodes } from '@elastic/eui';
import '../directives/scroll_bottom';
import './typeahead.less';
import './typeahead_input';
import './typeahead_item';

const { UP, DOWN, ENTER, TAB, ESCAPE } = comboBoxKeyCodes;
const typeahead = uiModules.get('kibana/typeahead');

typeahead.directive('kbnTypeahead', function () {
  return {
    template,
    transclude: true,
    restrict: 'E',
    scope: {
      items: '=',
      itemTemplate: '=',
      onSelect: '&'
    },
    bindToController: true,
    controllerAs: 'typeahead',
    controller: function ($scope, $element) {
      this.isHidden = true;
      this.selectedIndex = null;

      this.submit = () => {
        const item = this.items[this.selectedIndex];
        this.onSelect({ item });
        this.selectedIndex = null;
      };

      this.selectPrevious = () => {
        if (this.selectedIndex !== null && this.selectedIndex > 0) {
          this.selectedIndex--;
        } else {
          this.selectedIndex = this.items.length - 1;
        }
        this.scrollSelectedIntoView();
      };

      this.selectNext = () => {
        if (this.selectedIndex !== null && this.selectedIndex < this.items.length - 1) {
          this.selectedIndex++;
        } else {
          this.selectedIndex = 0;
        }
        this.scrollSelectedIntoView();
      };

      this.scrollSelectedIntoView = () => {
        const parent = $element.find('.typeahead-items')[0];
        const child = $element.find('.typeahead-item').eq(this.selectedIndex)[0];
        parent.scrollTop = Math.min(parent.scrollTop, child.offsetTop);
        parent.scrollTop = Math.max(parent.scrollTop, child.offsetTop + child.offsetHeight - parent.offsetHeight);
      };

      this.isVisible = () => {
        // Blur fires before click. If we only checked isFocused, then click events would never fire.
        const isFocusedOrMousedOver = this.isFocused || this.isMousedOver;
        return !this.isHidden && this.items && this.items.length > 0 && isFocusedOrMousedOver;
      };

      this.resetLimit = () => {
        this.limit = 50;
      };

      this.increaseLimit = () => {
        this.limit += 50;
      };

      this.onKeyDown = (event) => {
        const { keyCode } = event;

        if (keyCode === ESCAPE) this.isHidden = true;

        if ([TAB, ENTER].includes(keyCode) && !this.hidden && this.selectedIndex !== null) {
          event.preventDefault();
          this.submit();
        } else if (keyCode === UP && this.items.length > 0) {
          event.preventDefault();
          this.isHidden = false;
          this.selectPrevious();
        } else if (keyCode === DOWN && this.items.length > 0) {
          event.preventDefault();
          this.isHidden = false;
          this.selectNext();
        } else {
          this.selectedIndex = null;
        }
      };

      this.onKeyPress = () => {
        this.isHidden = false;
      };

      this.onItemClick = () => {
        this.submit();
        $scope.$broadcast('focus');
        $scope.$evalAsync(() => this.isHidden = false);
      };

      this.onFocus = () => {
        this.isFocused = true;
        this.isHidden = true;
        this.resetLimit();
      };

      this.onBlur = () => {
        this.isFocused = false;
      };

      this.onMouseEnter = () => {
        this.isMousedOver = true;
      };

      this.onMouseLeave = () => {
        this.isMousedOver = false;
      };
    }
  };
});
