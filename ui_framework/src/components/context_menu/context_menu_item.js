import React, {
  cloneElement,
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export class KuiContextMenuItem extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    icon: PropTypes.element,
    onClick: PropTypes.func,
    hasPanel: PropTypes.bool,
    buttonRef: PropTypes.func,
  }

  render() {
    const {
      children,
      className,
      hasPanel,
      icon,
      buttonRef,
      ...rest
    } = this.props;

    let iconInstance;

    if (icon) {
      iconInstance = cloneElement(icon, {
        className: classNames(icon.props.className, 'kuiContextMenu__icon'),
      });
    }

    let arrow;

    if (hasPanel) {
      arrow = <span className="kuiContextMenu__arrow kuiIcon fa-angle-right" />;
    }

    const classes = classNames('kuiContextMenuItem', className);

    return (
      <button
        className={classes}
        ref={buttonRef}
        {...rest}
      >
        <span className="kuiContextMenu__itemLayout">
          {iconInstance}
          <span className="kuiContextMenuItem__text">
            {children}
          </span>
          {arrow}
        </span>
      </button>
    );
  }
}
