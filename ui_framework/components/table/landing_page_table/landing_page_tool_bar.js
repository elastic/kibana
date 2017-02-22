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
    onFilter,
    pagerState,
    onNextPage,
    onPreviousPage,
    onDelete,
    addHref,
    selectedItemsCount }) {
  return <KuiToolBar>
    <KuiToolBarSection>
      <KuiToolBarSearchBox filter={filter} onFilter={onFilter}/>
    </KuiToolBarSection>

    <KuiToolBarSection>
      { selectedItemsCount > 0
        ? <DeleteButton onClick={onDelete}/>
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
  onFilter: React.PropTypes.func.isRequired,
  pagerState: React.PropTypes.any.isRequired,
  onDelete: React.PropTypes.func.isRequired,
  addHref: React.PropTypes.string.isRequired,
  selectedItemsCount: React.PropTypes.number.isRequired,
  onNextPage: React.PropTypes.func.isRequired,
  onPreviousPage: React.PropTypes.func.isRequired
};
