import React from 'react';
import classnames from 'classnames';

export function KuiModalHeader({ className, children, ...rest }) {
  const classes = classnames('kuiModalHeader', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiModalHeader.propTypes = {
  className: React.PropTypes.string,
  children: React.PropTypes.node
};
