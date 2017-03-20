import React from 'react';

export const KuiToolBar = (props) => <div className="kuiToolBar">{props.children}</div>;
KuiToolBar.propTypes = {
  children: React.PropTypes.node,
};

export const KuiToolBarFooter = (props) => <div className="kuiToolBarFooter">{props.children}</div>;
KuiToolBarFooter.propTypes = {
  children: React.PropTypes.node,
};
