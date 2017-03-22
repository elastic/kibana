import React from 'react';

import { KuiToolBarFooterSection, KuiToolBarText } from './';

export function KuiSelectedItemsFooterSection({ selectedItemsCount }) {
  return <KuiToolBarFooterSection>
    <KuiToolBarText>{selectedItemsCount} selected</KuiToolBarText>
  </KuiToolBarFooterSection>;
}

KuiSelectedItemsFooterSection.propTypes = {
  selectedItemsCount: React.PropTypes.number
};
