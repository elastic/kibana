import template from './typeahead.html';
import { uiModules } from 'ui/modules';
import { comboBoxKeyCodes } from '@elastic/eui';
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
    controller: function () {
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
      };

      this.selectNext = () => {
        if (this.selectedIndex !== null && this.selectedIndex < this.items.length - 1) {
          this.selectedIndex++;
        } else {
          this.selectedIndex = 0;
        }
      };

      this.isVisible = () => {
        // Blur fires before click. If we only checked isFocused, then click events would never fire.
        const isFocusedOrMousedOver = this.isFocused || this.isMousedOver;
        return !this.isHidden && this.items && this.items.length > 0 && isFocusedOrMousedOver;
      };

      this.onKeyDown = (event) => {
        const { keyCode } = event;

        this.isHidden = keyCode === ESCAPE;

        if ([TAB, ENTER].includes(keyCode) && !this.hidden && this.selectedIndex !== null) {
          event.preventDefault();
          this.submit();
        } else if (keyCode === UP) {
          event.preventDefault();
          this.selectPrevious();
        } else if (keyCode === DOWN) {
          event.preventDefault();
          this.selectNext();
        } else {
          this.selectedIndex = null;
        }
      };

      this.onFocus = () => {
        this.isFocused = true;
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
