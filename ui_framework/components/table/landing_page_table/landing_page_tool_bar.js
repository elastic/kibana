import React from 'react';

import {
  KuiToolBarSearchBox,
  KuiSectionedToolBar,
  KuiToolBarPager } from '../../tool_bar';

export function LandingPageToolBar({
    filter,
    onFilter,
    pagerState,
    onNextPage,
    onPreviousPage,
    actionButtons }) {
  const toolBarSections = [
    <KuiToolBarSearchBox filter={filter} onFilter={onFilter}/>,
    actionButtons
  ];

  if (pagerState) {
    toolBarSections.push(
      <KuiToolBarPager pagerState={pagerState} onNextPage={onNextPage} onPreviousPage={onPreviousPage}/>);
  }

  return <KuiSectionedToolBar sections={toolBarSections} />;
}

LandingPageToolBar.propTypes = {
  filter: React.PropTypes.string,
  onFilter: React.PropTypes.func.isRequired,
  actionButtons: React.PropTypes.node.isRequired,
  pagerState: React.PropTypes.any,
  onNextPage: React.PropTypes.func,
  onPreviousPage: React.PropTypes.func
};
