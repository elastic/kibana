import React from 'react';

import { KuiToolBarPagerSection, KuiToolBarFooterSection, KuiToolBarText } from '../../tool_bar';

export function LandingPageToolBarFooter({ selectedItemsCount, pagerState, onPreviousPage, onNextPage }) {
  function getSelectedItemsSection() {
    if (selectedItemsCount === 0) return null;

    return <KuiToolBarFooterSection>
      <KuiToolBarText>{selectedItemsCount} selected</KuiToolBarText>
    </KuiToolBarFooterSection>;
  }

  return <div className="kuiToolBarFooter">
      { getSelectedItemsSection() }
      <KuiToolBarPagerSection
        pagerState={pagerState}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}/>
    </div>;
}

LandingPageToolBarFooter.propTypes = {
  pagerState: React.PropTypes.any.isRequired,
  onNextPage: React.PropTypes.func.isRequired,
  onPreviousPage: React.PropTypes.func.isRequired,
  selectedItemsCount: React.PropTypes.number.isRequired
};

