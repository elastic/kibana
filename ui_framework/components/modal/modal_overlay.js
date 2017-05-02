import React from 'react';
import classnames from 'classnames';

export function KuiModalOverlay({ className,  ...rest }) {
  const classes = classnames('kuiModalOverlay', className);
  return (
    <div
      className={ classes }
      { ...rest}
    />
  );
}

KuiModalOverlay.propTypes = {
  className: React.PropTypes.string,
};
