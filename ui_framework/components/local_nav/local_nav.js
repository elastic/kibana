import classnames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

export function KuiLocalNav({ className, children, ...rest }) {
  const classes = classnames('kuiLocalNav', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiLocalNav.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
