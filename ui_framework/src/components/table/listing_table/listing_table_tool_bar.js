import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiToolBarSection,
} from '../../';

export function KuiListingTableToolBar({ pagerComponent, actionComponent, onFilter, filter }) {
  return (
    <KuiToolBar>
      <KuiToolBarSearchBox onFilter={onFilter} filter={filter} />

      <KuiToolBarSection>
        {actionComponent}
      </KuiToolBarSection>

      <KuiToolBarSection>
        {pagerComponent}
      </KuiToolBarSection>
    </KuiToolBar>
  );
}

KuiListingTableToolBar.propTypes = {
  filter: PropTypes.string,
  onFilter: PropTypes.func.isRequired,
  pagerComponent: PropTypes.node,
  actionComponent: PropTypes.node,
};
