import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiToolBarSection,
} from '../../';

export function KuiListingTableToolBar({ pagerComponent, actionComponent, onFilter }) {
  return (
    <KuiToolBar>
      <KuiToolBarSearchBox onFilter={onFilter} />

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
  onFilter: PropTypes.func.isRequired,
  pagerComponent: PropTypes.node,
  actionComponent: PropTypes.node,
};
