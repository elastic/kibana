import './typeahead.less';
import './typeahead_input';
import './typeahead_item';
import template from './typeahead.html';
import { uiModules } from 'ui/modules';
import { comboBoxKeyCodes } from '@elastic/eui';

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
        this.isHidden = true;
      };

      /**
       * Sets the selected index to the given value. If the value is less than
       * zero, it will wrap around to the end, and if the value is greater than
       * the number of items, it will wrap around to the beginning.
       */
      this.setSelectedIndex = (index) => {
        this.selectedIndex = (index + this.items.length) % this.items.length;
      };

      this.selectPrevious = () => {
        const previousIndex = (this.selectedIndex === null ? 0 : this.selectedIndex) - 1;
        this.setSelectedIndex(previousIndex);
      };

      this.selectNext = () => {
        const nextIndex = (this.selectedIndex === null ? -1 : this.selectedIndex) + 1;
        this.setSelectedIndex(nextIndex);
      };

      this.isVisible = () => {
        // Blur fires before click. If we only checked isFocused, then click events would never fire.
        const isFocusedOrMousedOver = this.isFocused || this.isMousedOver;
        return !this.isHidden && this.items.length > 0 && isFocusedOrMousedOver;
      };

      this.onKeyDown = (event) => {
        const { keyCode } = event;

        this.isHidden = (keyCode === ESCAPE);

        if ([TAB, ENTER].includes(keyCode) && !this.hidden && this.selectedIndex !== null) {
          event.preventDefault();
          this.submit();
        } else if (keyCode === UP) {
          this.selectPrevious();
        } else if (keyCode === DOWN) {
          this.selectNext();
        }
      };

      this.onKeyPress = () => {
        this.selectedIndex = null;
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
