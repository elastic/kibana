import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const paddingSizeToClassNameMap = {
  'none': null,
  's': 'kuiPanel--paddingSmall',
  'm': 'kuiPanel--paddingMedium',
  'l': 'kuiPanel--paddingLarge',
};

export const SIZES = Object.keys(paddingSizeToClassNameMap);

export const KuiPanel = ({
  children,
  className,
  paddingSize,
  hasShadow,
  ...rest,
}) => {

  const classes = classNames(
    'kuiPanel',
    paddingSizeToClassNameMap[paddingSize],
    {
      'kuiPanel-hasShadow': hasShadow,
    },
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
  hasShadow: PropTypes.bool,
  paddingSize: PropTypes.oneOf(SIZES),
};

KuiPanel.defaultProps = {
  paddingSize: 'm',
  hasShadow: false,
};
