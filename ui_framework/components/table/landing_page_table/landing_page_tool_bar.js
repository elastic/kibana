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
  return <KuiSectionedToolBar sections={
    [
      <KuiToolBarSearchBox filter={filter} onFilter={onFilter}/>,
      actionButtons,
      <KuiToolBarPager pagerState={pagerState} onNextPage={onNextPage} onPreviousPage={onPreviousPage}/>
    ]
  }/>;
}

LandingPageToolBar.propTypes = {
  filter: React.PropTypes.string,
  onFilter: React.PropTypes.func.isRequired,
  actionButtons: React.PropTypes.node.isRequired,
  pagerState: React.PropTypes.any.isRequired,
  onNextPage: React.PropTypes.func.isRequired,
  onPreviousPage: React.PropTypes.func.isRequired
};
