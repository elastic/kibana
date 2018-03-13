import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiToolBarSection,
} from '../../';

export function KuiListingTableToolBar({ pager, actions, onFilter, filter }) {
  let actionsSection;

  if (actions) {
    actionsSection = (
      <KuiToolBarSection>
        {actions}
      </KuiToolBarSection>
    );
  }

  let pagerSection;

  if (pager) {
    pagerSection = (
      <KuiToolBarSection>
        {pager}
      </KuiToolBarSection>
    );
  }

  return (
    <KuiToolBar>
      <KuiToolBarSearchBox onFilter={onFilter} filter={filter} />
      {actionsSection}
      {pagerSection}
    </KuiToolBar>
  );
}

KuiListingTableToolBar.propTypes = {
  filter: PropTypes.string,
  onFilter: PropTypes.func.isRequired,
  pager: PropTypes.node,
  actions: PropTypes.node,
};
