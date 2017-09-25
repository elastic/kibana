import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

const textSizeToClassNameMap = {
  s: 'kuiText--small',
};

export const TEXT_SIZES = Object.keys(textSizeToClassNameMap);

export const KuiText = ({ size, children, className, ...rest }) => {

  const classes = classNames(
    'kuiText',
    textSizeToClassNameMap[size],
    className
  );

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
};

KuiText.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  size: PropTypes.oneOf(TEXT_SIZES),
};
