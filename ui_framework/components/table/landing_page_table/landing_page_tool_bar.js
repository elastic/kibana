import React from 'react';

import {
  KuiToolBarSearchBox,
  KuiSectionedToolBar,
  KuiToolBarPager } from '../../tool_bar';

export function LandingPageToolBar({
    filter,
    onFilter,
    hasPreviousPage,
    hasNextPage,
    onNextPage,
    onPreviousPage,
    actionButtons,
    startNumber,
    endNumber,
    totalItems,
}) {
  const toolBarSections = [
    <KuiToolBarSearchBox filter={filter} onFilter={onFilter}/>,
    actionButtons
  ];

  if (startNumber > 0) {
    toolBarSections.push(<KuiToolBarPager
      startNumber={startNumber}
      endNumber={endNumber}
      totalItems={totalItems}
      hasPreviousPage={hasPreviousPage}
      hasNextPage={hasNextPage}
      onNextPage={onNextPage}
      onPreviousPage={onPreviousPage}
    />);
  }

  return <KuiSectionedToolBar sections={toolBarSections} />;
}

LandingPageToolBar.propTypes = {
  filter: React.PropTypes.string,
  onFilter: React.PropTypes.func.isRequired,
  actionButtons: React.PropTypes.node,
  hasPreviousPage: React.PropTypes.func,
  hasNextPage: React.PropTypes.func,
  onNextPage: React.PropTypes.func,
  onPreviousPage: React.PropTypes.func,
  startNumber: React.PropTypes.number,
  endNumber: React.PropTypes.number,
  totalItems: React.PropTypes.number,
};
