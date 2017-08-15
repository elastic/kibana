import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiFormHelpText = ({ children, className, ...rest }) => {
  const classes = classNames('kuiFormHelpText', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFormHelpText.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
