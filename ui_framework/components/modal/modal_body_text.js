import React from 'react';
import classnames from 'classnames';

export function KuiModalBodyText({ className, children, ...rest }) {
  const classes = classnames('kuiModalBodyText', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiModalBodyText.propTypes = {
  className: React.PropTypes.string,
  children: React.PropTypes.node
};
