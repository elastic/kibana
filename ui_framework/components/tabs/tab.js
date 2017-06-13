import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTab = ({ title, isSelected, onClick, children, ...rest }) => {
  const classes = classNames('kuiTab', {
    'kuiTab-isSelected': isSelected
  });
  const child = children ? children : title;

  return (
    <button
      className={classes}
      title={title}
      onClick={onClick}
      {...rest}
    >
      {child}
    </button>
  );
};

KuiTab.propTypes = {
  title: PropTypes.string.isRequired,
  isSelected: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node,
};
