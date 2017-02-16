import React from 'react';

import {
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiToolBarPagerButtons,
  KuiToolBarSection,
  KuiToolBarPagerSection } from '../../tool_bar';

import { CreateButtonLink, DeleteButton } from '../../button';

export function LandingPageToolBar({
    filter,
    doFilter,
    pagerState,
    onNextPage,
    onPreviousPage,
    doDelete,
    addHref,
    selectedItemsCount }) {
  return <KuiToolBar>
    <KuiToolBarSection>
      <KuiToolBarSearchBox filter={filter} doFilter={doFilter}/>
    </KuiToolBarSection>

    <KuiToolBarSection>
      { selectedItemsCount > 0
        ? <DeleteButton onClick={doDelete}/>
        : <CreateButtonLink href={addHref}/>
      }
    </KuiToolBarSection>

    <KuiToolBarPagerSection
      pagerState={pagerState}
      onNextPage={onNextPage}
      onPreviousPage={onPreviousPage}/>
  </KuiToolBar>;
}

LandingPageToolBar.propTypes = {
  filter: React.PropTypes.string,
  doFilter: React.PropTypes.func.isRequired,
  pagerState: React.PropTypes.any.isRequired,
  doDelete: React.PropTypes.func.isRequired,
  addHref: React.PropTypes.string.isRequired,
  selectedItemsCount: React.PropTypes.number.isRequired,
  onNextPage: React.PropTypes.func.isRequired,
  onPreviousPage: React.PropTypes.func.isRequired
};
