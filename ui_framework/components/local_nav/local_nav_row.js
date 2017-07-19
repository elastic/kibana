import classnames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

export function KuiLocalNavRow({ className, children, isSecondary, ...rest }) {
  const classes = classnames('kuiLocalNavRow', className, {
    'kuiLocalNavRow--secondary': isSecondary,
  });
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiLocalNavRow.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
  isSecondary: PropTypes.bool,
};

KuiLocalNavRow.defaultProps = {
  isSecondary: false,
};
