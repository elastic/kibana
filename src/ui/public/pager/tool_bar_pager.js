import React from 'react';

import { PagerHelper } from './index';
import { KuiToolBarPager } from 'ui_framework/components';

export function ToolBarPager({ currentPageIndex, itemsPerPage, totalItems, onNextPage, onPreviousPage }) {
  const pager = new PagerHelper(itemsPerPage ? itemsPerPage : 20);
  const startNumber = pager.getStartNumber(totalItems, currentPageIndex);
  const endNumber = pager.getEndNumber(totalItems, currentPageIndex);
  const hasPreviousPage = pager.canPagePrevious(currentPageIndex);
  const hasNextPage = pager.canPageNext(totalItems, currentPageIndex);

  return <KuiToolBarPager
    startNumber={startNumber}
    endNumber={endNumber}
    totalItems={totalItems}
    hasPreviousPage={hasPreviousPage}
    hasNextPage={hasNextPage}
    onNextPage={onNextPage}
    onPreviousPage={onPreviousPage}/>;
}

ToolBarPager.propTypes = {
  currentPageIndex: React.PropTypes.number,
  totalItems: React.PropTypes.number,
  itemsPerPage: React.PropTypes.number,
  onNextPage: React.PropTypes.func.isRequired,
  onPreviousPage: React.PropTypes.func.isRequired
};


