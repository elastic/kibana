/**
 * Per the ARIA Listbox spec, this is how this component should behave:
 *  - Alt + Down: If the input has focus, open the dropdown.
 *  - Alt + Up: Close the dropdown and focus the input.
 *  - Up/Down: Move focus to the previous/next option.
 *  - Page Up/Down: Move focus to the previous/next page's option.
 *  - Escape: Close the dropdown and focus the input.
 *  - Enter: If an option is focused, select it, close the dropdown, and focus the input.
 *  - (Any character): If an option is focused, move focus to the option that begins with that
 *    character.
 */

import React, {
  cloneElement,
  Component,
} from 'react';
import { findDOMNode } from 'react-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { comboBoxKeyCodes } from '../../services';
import { KuiComboBoxDropdown } from './combo_box_dropdown/combo_box_dropdown';
import { KuiComboBoxInput } from './combo_box_input/combo_box_input';

const SIZES = [
  'small',
  'large',
];

const sizeToClassNameMap = {
  small: 'kuiComboBox--small',
  large: 'kuiComboBox--large',
};

class KuiComboBox extends Component {
  constructor() {
    super();

    this.state = {
      isDropdownOpen: false,
    };

    this.focusedOptionIndex = 0;

    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidUpdate() {
    const node = findDOMNode(this);
    this.options = node.querySelectorAll('.kuiComboBoxOption:not(.kuiComboBoxOption-isDisabled)');
    console.log(this.options)
  }

  focusPreviousOption() {
    this.focusedOptionIndex--;
    if (this.focusedOptionIndex < 0) {
      this.focusedOptionIndex = this.options.length - 1;
    }
    this.options[this.focusedOptionIndex].focus();
  }

  focusNextOption() {
    this.focusedOptionIndex++;
    if (this.focusedOptionIndex === this.options.length) {
      this.focusedOptionIndex = 0;
    }
    console.log(this.focusedOptionIndex, this.options.length)
    this.options[this.focusedOptionIndex].focus();
  }

  onFocus() {
    // this.setState({
    //   isDropdownOpen: true,
    // });
  }

  onBlur(e) {
    console.log('blur', e.target)
    // this.setState({
    //   isDropdownOpen: false,
    // });
  }

  onKeyDown(e) {
    switch (e.keyCode) {
      case comboBoxKeyCodes.DOWN:
        this.focusNextOption();
        break;
      case comboBoxKeyCodes.UP:
        this.focusPreviousOption();
        break;
      case comboBoxKeyCodes.ENTER:
        break;
      case comboBoxKeyCodes.ESC:
        break;
    }
  }

  render() {
    const {
      children,
      className,
      onChange,
      type,
      value,
      size,
       ...rest,
    } = this.props;

    const classes = classNames('kuiComboBox', className, sizeToClassNameMap[size]);

    // this.optionRefs = [];
    // const keyboardAccessibleChildren = this.makeKeyboardAccessibleOptions(children);
    // console.log(this.optionRefs)
    // console.log(this.refs['option1'])
    let dropdown;

    if (this.state.isDropdownOpen) {
      dropdown = (
        <KuiComboBoxDropdown>
          {children}
        </KuiComboBoxDropdown>
      );
    }

    return (
      <div
        role="combobox"
        aria-expanded={this.state.isDropdownOpen}
        className={classes}
        onKeyDown={this.onKeyDown}
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        {...rest}
      >
        <KuiComboBoxInput
          type={type}
          value={value}
          onChange={onChange}
        />

        {dropdown}
      </div>
    );
  }
}

KuiComboBox.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  onChange: PropTypes.func,
  type: PropTypes.string,
  value: PropTypes.string,
  size: PropTypes.oneOf(SIZES),
};

export {
  SIZES,
  KuiComboBox,
};
