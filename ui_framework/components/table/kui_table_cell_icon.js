import React from 'react';

import { KuiTableCellLiner } from './kui_table_cell_liner';

export function KuiTableCellIcon({ title, icon }) {
  const iconClassNames = `kuiStatusText__icon kuiIcon ${icon}`;
  return <KuiTableCellLiner>
      <span className="kuiStatusText">
        <span className={iconClassNames}/>
        {title}
      </span>
  </KuiTableCellLiner>;
}

KuiTableCellIcon.propTypes = {
  title: React.PropTypes.any.isRequired,
  icon: React.PropTypes.string
};
