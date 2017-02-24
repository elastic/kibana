import React from 'react';

import { KuiToolBarSection, KuiToolBarPager } from '../../tool_bar';
import { KuiSelectedItemsFooterSection } from '../../tool_bar/kui_selected_items_footer_section';

export function LandingPageToolBarFooter({ selectedItemsCount, pagerState, onPreviousPage, onNextPage }) {
  return <div className="kuiToolBarFooter">
      {
        selectedItemsCount > 0
          ? <KuiSelectedItemsFooterSection selectedItemsCount={selectedItemsCount}/>
          : null
      }
      <KuiToolBarSection>
        {
          pagerState
          ? <KuiToolBarPager
              pagerState={pagerState}
              onNextPage={onNextPage}
              onPreviousPage={onPreviousPage}/>
          : null
        }
        </KuiToolBarSection>
    </div>;
}

LandingPageToolBarFooter.propTypes = {
  pagerState: React.PropTypes.any,
  onNextPage: React.PropTypes.func,
  onPreviousPage: React.PropTypes.func,
  selectedItemsCount: React.PropTypes.number.isRequired
};

