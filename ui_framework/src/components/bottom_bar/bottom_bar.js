import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const paddingSizeToClassNameMap = {
  'none': null,
  's': 'kuiBottomBar--paddingSmall',
  'm': 'kuiBottomBar--paddingMedium',
  'l': 'kuiBottomBar--paddingLarge',
};

export const SIZES = Object.keys(paddingSizeToClassNameMap);

export const KuiBottomBar = ({
  children,
  className,
  paddingSize,
  ...rest,
}) => {
  const classes = classNames(
    'kuiBottomBar',
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

KuiBottomBar.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

KuiBottomBar.defaultProps = {
  paddingSize: 'm',
};
