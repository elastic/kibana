import React from 'react';

import { KuiToolBarPagerText } from './kui_tool_bar_pager_text';
import { KuiToolBarPagerButtons } from './kui_tool_bar_pager_buttons';

export function KuiToolBarPager({ pagerState, onNextPage, onPreviousPage }) {
  return <div>
      <KuiToolBarPagerText
        start={pagerState.startNumber}
        end={pagerState.endNumber}
        count={pagerState.totalItems} />
      <KuiToolBarPagerButtons
        hasNext={pagerState.hasNextPage}
        hasPrevious={pagerState.hasPreviousPage}
        onNext={onNextPage}
        onPrevious={onPreviousPage}
      />
    </div>;
}

KuiToolBarPager.propTypes = {
  pagerState: React.PropTypes.any.isRequired,
  onNextPage: React.PropTypes.func.isRequired,
  onPreviousPage: React.PropTypes.func.isRequired
};


