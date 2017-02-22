import React from 'react';

import { KuiToolBarPagerSection } from '../../tool_bar';
import { KuiSelectedItemsFooterSection } from '../../tool_bar/kui_selected_items_footer_section';

export function LandingPageToolBarFooter({ selectedItemsCount, pagerState, onPreviousPage, onNextPage }) {
  return <div className="kuiToolBarFooter">
      {
        selectedItemsCount > 0
          ? <KuiSelectedItemsFooterSection selectedItemsCount={selectedItemsCount}/>
          : null
      }
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

