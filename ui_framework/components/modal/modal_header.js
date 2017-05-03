import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';

export function KuiModalHeader({ className, children, ...rest }) {
  const classes = classnames('kuiModalHeader', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiModalHeader.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
};
