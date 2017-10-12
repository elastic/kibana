import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiToolBarSection,
} from '../../';

export function KuiListingTableToolBar({ pager, actions, onFilter, filter }) {
  return (
    <KuiToolBar>
      <KuiToolBarSearchBox onFilter={onFilter} filter={filter} />

      <KuiToolBarSection>
        {actions}
      </KuiToolBarSection>

      <KuiToolBarSection>
        {pager}
      </KuiToolBarSection>
    </KuiToolBar>
  );
}

KuiListingTableToolBar.propTypes = {
  filter: PropTypes.string,
  onFilter: PropTypes.func.isRequired,
  pager: PropTypes.node,
  actions: PropTypes.node,
};
