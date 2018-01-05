import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const paddingSizeToClassNameMap = {
  'none': null,
  's': 'kuiPanelSimple--paddingSmall',
  'm': 'kuiPanelSimple--paddingMedium',
  'l': 'kuiPanelSimple--paddingLarge',
};

export const SIZES = Object.keys(paddingSizeToClassNameMap);

export const KuiPanelSimple = ({
  children,
  className,
  paddingSize,
  hasShadow,
  grow,
  panelRef,
  ...rest
}) => {

  const classes = classNames(
    'kuiPanelSimple',
    paddingSizeToClassNameMap[paddingSize],
    {
      'kuiPanelSimple--shadow': hasShadow,
      'kuiPanelSimple--flexGrowZero': !grow,
    },
    className
  );

  return (
    <div
      ref={panelRef}
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );

};

KuiPanelSimple.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  hasShadow: PropTypes.bool,
  paddingSize: PropTypes.oneOf(SIZES),
  grow: PropTypes.bool,
  panelRef: PropTypes.func,
};

KuiPanelSimple.defaultProps = {
  paddingSize: 'm',
  hasShadow: false,
  grow: true,
};
