import classnames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

export function KuiLocalTabs({ className, children, ...rest }) {
  const classes = classnames('kuiLocalTabs', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiLocalTabs.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
