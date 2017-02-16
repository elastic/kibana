import React from 'react';

import { KuiToolBarPagerButtons, KuiToolBarSection, KuiToolBarPagerText } from './';

export function KuiToolBarPagerSection({
  pagerState,
  onNextPage,
  onPreviousPage }) {
  return <KuiToolBarSection>
      <KuiToolBarPagerText
        startNumber={pagerState.startItem}
        endNumber={pagerState.endItem}
        totalCount={pagerState.totalItems} />
      <KuiToolBarPagerButtons
        hasNext={pagerState.hasNextPage}
        hasPrevious={pagerState.hasPreviousPage}
        onNext={onNextPage}
        onPrevious={onPreviousPage}
      />
    </KuiToolBarSection>;
}
KuiToolBarPagerSection.propTypes = {
  pagerState: React.PropTypes.any.isRequired,
  onNextPage: React.PropTypes.func.isRequired,
  onPreviousPage: React.PropTypes.func.isRequired
};
