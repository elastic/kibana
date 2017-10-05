import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiToolBarFooter,
  KuiToolBarText,
  KuiToolBarFooterSection,
} from '../../';

export function KuiListingTableToolBarFooter({ pager, itemsSelectedCount }) {
  return (
    <KuiToolBarFooter>
      <KuiToolBarFooterSection>
        <KuiToolBarText>
          {itemsSelectedCount === 1 && '1 item selected'}
          {itemsSelectedCount > 1 && `${itemsSelectedCount} items selected`}
        </KuiToolBarText>
      </KuiToolBarFooterSection>

      <KuiToolBarFooterSection>
        {pager}
      </KuiToolBarFooterSection>
    </KuiToolBarFooter>
  );
}

KuiListingTableToolBarFooter.PropTypes = {
  pager: PropTypes.node,
  itemsSelectedCount: PropTypes.number,
};
