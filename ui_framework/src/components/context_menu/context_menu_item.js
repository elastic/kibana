import React, {
  cloneElement,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiContextMenuItem = ({
  children,
  className,
  hasPanel,
  icon,
  ...rest,
}) => {
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
};

KuiContextMenuItem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  icon: PropTypes.element,
  onClick: PropTypes.func,
  hasPanel: PropTypes.bool,
};
