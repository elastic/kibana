import React from 'react';

import classnames from 'classnames';

export const KuiTable = ({ children }) => <table className="kuiTable">{children}</table>;
KuiTable.propTypes = { children: React.PropTypes.any };

export const KuiTHead = ({ children }) => <thead>{children}</thead>;
KuiTHead.propTypes = { children: React.PropTypes.any };

export const KuiTBody = ({ children }) => <tbody>{children}</tbody>;
KuiTBody.propTypes = { children: React.PropTypes.any };

export const KuiTr = ({ children }) => <tr className="kuiTableRow">{children}</tr>;
KuiTr.propTypes = { children: React.PropTypes.any };

export function KuiTh({ children, className, onClick }) {
  return <th className={classnames('kuiTableHeaderCell', className)} onClick={() => { if (onClick) onClick(); } }>
    {children}
  </th>;
}
KuiTh.propTypes = {
  children: React.PropTypes.any,
  className: React.PropTypes.string,
  onClick: React.PropTypes.func
};

export function KuiTd({ children, className }) {
  return <td className={classnames('kuiTableRowCell', className)}>{children}</td>;
}
KuiTd.propTypes = {
  children: React.PropTypes.any,
  className: React.PropTypes.string
};
