import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTable = ({ children, className, ...rest }) => {
  const classes = classNames('kuiTable', className);
  return <table className={classes} {...rest} >{children}</table>;
};
KuiTable.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};



