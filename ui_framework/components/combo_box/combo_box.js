import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
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

    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  onFocus() {
    this.setState({
      isDropdownOpen: true,
    });
  }

  onBlur() {
    this.setState({
      isDropdownOpen: false,
    });
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
        className={classes}
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
