import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const paddingSizeToClassNameMap = {
  's': 'kuiPanel--paddingSmall',
  'm': 'kuiPanel--paddingMedium',
  'l': 'kuiPanel--paddingLarge',
};

export const SIZES = Object.keys(paddingSizeToClassNameMap);

export const KuiPanel = ({
  children,
  className,
  paddingSize,
  ...rest,
}) => {

  const classes = classNames(
    'kuiPanel',
    paddingSizeToClassNameMap[paddingSize],
    className
  );

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );

};

KuiPanel.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  paddingSize: PropTypes.oneOf(SIZES),
};

KuiPanel.defaultProps = {
  paddingSize: 'm',
};
