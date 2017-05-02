import React from 'react';
import classnames from 'classnames';

export function KuiModalHeaderTitle({ className, children, ...rest }) {
  const classes = classnames('kuiModalHeader__title', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiModalHeaderTitle.propTypes = {
  className: React.PropTypes.string,
  children: React.PropTypes.node
};
