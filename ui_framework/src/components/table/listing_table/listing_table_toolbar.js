import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiToolBarSection,
} from '../../';

export function KuiListingTableToolbar({ pagerComponent, actionComponent, onFilter }) {
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

KuiListingTableToolbar.propTypes = {
  onFilter: PropTypes.func.isRequired,
  pagerComponent: PropTypes.node,
  actionComponent: PropTypes.node,
};
