import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';

export function KuiModalBody({ className, children, ...rest }) {
  const classes = classnames('kuiModalBody', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiModalBody.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
};
