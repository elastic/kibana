import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTab = ({ isSelected, onClick, children, className, ...rest }) => {
  const classes = classNames('kuiTab', className, {
    'kuiTab-isSelected': isSelected
  });

  return (
    <button
      className={classes}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
};

KuiTab.propTypes = {
  isSelected: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node,
  className: PropTypes.string
};
