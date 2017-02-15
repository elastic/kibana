import React from 'react';

export function KuiIcon({ className }) {
  const classNames = ['kuiButton__icon', 'kuiIcon', className];
  return <span aria-hidden="true" className={ classNames.join(' ') }/>;
}
