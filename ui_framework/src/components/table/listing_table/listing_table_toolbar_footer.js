import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiToolBarFooter,
  KuiToolBarText,
  KuiToolBarFooterSection,
} from '../../';

export function KuiListingTableToolbarFooter({ pagerComponent, itemsSelectedCount }) {
  return (
    <KuiToolBarFooter>
      <KuiToolBarFooterSection>
        <KuiToolBarText>
          {itemsSelectedCount > 0 && `${itemsSelectedCount} items selected`}
        </KuiToolBarText>
      </KuiToolBarFooterSection>

      <KuiToolBarFooterSection>
        {pagerComponent}
      </KuiToolBarFooterSection>
    </KuiToolBarFooter>
  );
}

KuiListingTableToolbarFooter.PropTypes = {
  pagerComponent: PropTypes.node,
  itemsSelectedCount: PropTypes.number,
};
