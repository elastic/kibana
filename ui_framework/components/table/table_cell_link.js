import React from 'react';

import { KuiTd } from './index';

export function KuiTableCellLink({ title, href }) {
  return <KuiTd>
      <div className="kuiTableRowCell__liner">
        <a className="kuiLink" href={href}>{title}</a>
      </div>
    </KuiTd>;
}

KuiTableCellLink.propTypes = {
  title: React.PropTypes.string.isRequired,
  href: React.PropTypes.string.isRequired
};
