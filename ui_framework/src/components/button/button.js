import React, {
  Component,
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiIcon } from '../../components';

const typeToClassNameMap = {
  danger: 'kuiButton--danger',
  warning: 'kuiButton--warning',
  secondary: 'kuiButton--secondary',
  disabled: 'kuiButton--disabled',
};

const sizeToClassNameMap = {
  small: 'kuiButton--small',
  large: 'kuiButton--large',
};

export const TYPES = Object.keys(typeToClassNameMap);
export const SIZES = Object.keys(sizeToClassNameMap);

export class KuiButton extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      children,
      className,
      icon,
      iconReverse,
      type,
      size,
      fill,
      ...rest,
    } = this.props;

    const classes = classNames(
      'kuiButton',
      typeToClassNameMap[type],
      sizeToClassNameMap[size],
      className,
      fill === true ? 'kuiButton--fill' : '',
      iconReverse === true ? 'kuiButton--reverse' : ''
    );

    // Add an icon to the button if one exists.
    let buttonIcon = null;
    if (icon) {
      buttonIcon =
        <span aria-hidden="true">
          <KuiIcon className="kuiButton__icon" type={icon} size="medium" />
        </span>;
    }

    return (
      <button
        className={classes}
        {...rest}
      >
        <span className="kuiButton__content">
          {buttonIcon}
          <span>{children}</span>
        </span>
      </button>
    );
  }
}

KuiButton.propTypes = {
  iconReverse: React.PropTypes.bool,
  fill: React.PropTypes.bool,
  type: PropTypes.oneOf(TYPES),
  size: PropTypes.oneOf(SIZES),
};

KuiButton.defaultProps = {
  iconReverse: false,
  fill: false,
};
