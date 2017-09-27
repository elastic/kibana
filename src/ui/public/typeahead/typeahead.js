import './typeahead.less';
import './typeahead_input';
import './typeahead_item';
import template from './typeahead.html';
import { comboBoxKeyCodes } from 'ui_framework/services';
import { uiModules } from 'ui/modules';

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
        // Blur fires before click so if we don't show even after blur then the click won't fire
        return this.items.length > 0 && !this.isHidden && (this.isFocused || this.isMousedOver);
      };

      this.onKeyDown = (event) => {
        // Prevent up/down from moving the cursor in the input
        const isUpOrDownArrow = [UP, DOWN].includes(event.keyCode);

        // Prevent enter from submitting the form if there is a selection
        const isEnterWithSelection = event.keyCode === ENTER && this.selectedIndex !== null;

        if (this.isVisible() && (isUpOrDownArrow || isEnterWithSelection)) {
          event.preventDefault();
        }
      };

      this.onKeyUp = (event) => {
        const { keyCode } = event;

        this.isHidden = (keyCode === ESCAPE);

        if ([TAB, ENTER].includes(keyCode) && this.selectedIndex !== null) {
          this.submit();
        } else if (keyCode === UP) {
          this.selectPrevious();
        } else if (keyCode === DOWN) {
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
