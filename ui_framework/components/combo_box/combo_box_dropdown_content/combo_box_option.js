import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  KuiKeyboardAccessible,
} from '../../index';

// NOTE: This needs to be a Component because we'll dynamically assign it a ref from within
// the parent KuiComboBox instance.
export class KuiComboBoxOption extends Component {
  render() {
    const {
      children,
      className,
      onClick,
      isDisabled,
       ...rest,
    } = this.props;

    const classes = classNames('kuiComboBoxOption', className, {
      'kuiComboBoxOption-isDisabled': isDisabled,
    });

    const props = {
      // We'll use this identifier to support keyboard accessibility and move focus among options.
      identifier: !isDisabled ? 'data-combo-box-option' : undefined,
      className: classes,
      onClick,
      ...rest,
    };

    const option = React.createElement('div', props, children);
    // const option = (
    //   <div
    //     className={classes}
    //     onClick={onClick}
    //     {...rest}
    //   >
    //     {children}
    //   </div>
    // );

    if (!onClick) {
      return option;
    }

    // KuiKeyboardAccessible complains if there's no onClick assigned.
    return (
      <KuiKeyboardAccessible>
        {option}
      </KuiKeyboardAccessible>
    );
  }
}

KuiComboBoxOption.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  onClick: PropTypes.func,
  isDisabled: PropTypes.bool,
};
