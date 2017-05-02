import React from 'react';
import classnames from 'classnames';

export function KuiModalBody({ className, children, ...rest }) {
  const classes = classnames('kuiModalBody', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiModalBody.propTypes = {
  className: React.PropTypes.string,
  children: React.PropTypes.node
};
