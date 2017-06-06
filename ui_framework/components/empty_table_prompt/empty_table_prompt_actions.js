import React from 'react';
import classNames from 'classnames';

export const KuiEmptyTablePromptActions = ({ children, className, ...rest }) => {
  const classes = classNames('kuiEmptyTablePrompt__actions', className);
  return <div className={classes} {...rest}>{children}</div>;
};
KuiEmptyTablePromptActions.propTypes = {
  children: React.PropTypes.node,
  className: React.PropTypes.string
};
