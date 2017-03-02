import React from 'react';

import { KuiTd } from './index';

export function KuiTableCellLiner({ children, className }) {
  return <KuiTd className={className}><div className="kuiTableRowCell__liner">{children}</div></KuiTd>;
}
KuiTableCellLiner.propTypes = {
  children: React.PropTypes.node,
  className: React.PropTypes.string
};
