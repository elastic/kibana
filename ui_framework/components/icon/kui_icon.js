import React from 'react';
import classNames from 'classnames';

export function KuiIcon({ className }) {
  const classes = classNames('kuiButton__icon kuiIcon', className);
  return <span aria-hidden="true" className={ classes } />;
}
