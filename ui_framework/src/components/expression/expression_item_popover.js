import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { KuiOutsideClickDetector } from '../outside_click_detector';

const POPOVER_ALIGN = [
  'left',
  'right',
];

const KuiExpressionItemPopover = ({
  className,
  title,
  children,
  align,
  onOutsideClick,
  ...rest
}) => {
  const classes = classNames('kuiExpressionItem__popover', className, {
    'kuiExpressionItem__popover--alignRight': align === 'right'
  });
  return (
    <KuiOutsideClickDetector onOutsideClick={onOutsideClick}>
      <div
        className={classes}
        {...rest}
      >
        <div className="kuiExpressionItem__popoverTitle">
          {title}
        </div>
        <div className="kuiExpressionItem__popoverContent">
          {children}
        </div>
      </div>
    </KuiOutsideClickDetector>
  );
};

KuiExpressionItemPopover.defaultProps = {
  align: 'left',
};

KuiExpressionItemPopover.propTypes = {
  className: PropTypes.string,
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  align: PropTypes.oneOf(POPOVER_ALIGN),
  onOutsideClick: PropTypes.func.isRequired,
};

export {
  POPOVER_ALIGN,
  KuiExpressionItemPopover
};
