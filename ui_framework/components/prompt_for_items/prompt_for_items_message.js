import React from 'react';
import classNames from 'classnames';

export const KuiPromptForItemsMessage = ({ children, className, ...rest }) => {
  const classes = classNames('kuiPromptForItems__message', className);
  return <div className={classes} {...rest}>{children}</div>;
};
KuiPromptForItemsMessage.propTypes = {
  children: React.PropTypes.node,
  className: React.PropTypes.string,
};
