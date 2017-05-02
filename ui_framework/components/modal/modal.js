import React from 'react';
import classnames from 'classnames';

export function KuiModal({ className, children, ...rest }) {
  const classes = classnames('kuiModal', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiModal.propTypes = {
  className: React.PropTypes.string,
  children: React.PropTypes.node
};
