import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiHeaderBarSection = ({ children, className, ...rest }) => {
  const classes = classNames('kuiHeaderBarSection', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
KuiHeaderBarSection.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
