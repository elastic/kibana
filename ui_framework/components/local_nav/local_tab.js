import classnames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

export function KuiLocalTab({ className, children, isDisabled, isSelected, ...rest }) {
  const classes = classnames('kuiLocalTab', className, {
    'kuiLocalTab-isDisabled': isDisabled,
    'kuiLocalTab-isSelected': isSelected,
  });
  return (
    <a className={ classes } { ...rest }>
      { children }
    </a>
  );
}

KuiLocalTab.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
  isDisabled: PropTypes.bool,
  isSelected: PropTypes.bool,
};

KuiLocalTab.defaultProps = {
  isDisabled: false,
  isSelected: false,
};
