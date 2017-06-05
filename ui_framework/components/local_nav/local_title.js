import classnames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

export function KuiLocalTitle({ className, children, ...rest }) {
  const classes = classnames('kuiLocalTitle', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiLocalTitle.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
