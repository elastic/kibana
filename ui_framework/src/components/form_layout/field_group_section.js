import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiFieldGroupSection = ({
  isWide,
  children,
  className,
  ...rest
}) => {
  const classes = classNames('kuiFieldGroupSection', className, {
    'kuiFieldGroupSection--wide': isWide
  });
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFieldGroupSection.defaultProps = {
  isWide: false
};

KuiFieldGroupSection.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  isWide: PropTypes.bool
};
