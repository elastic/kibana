import React from 'react';

import {
  KuiButton,
  KuiButtonIcon,
  KuiPager,
  KuiEmptyTablePrompt,
  KuiEmptyTablePromptPanel,
  KuiListingTable,
  KuiTableHeaderCell,
  KuiListingTableNoMatchesPrompt,
} from '../../../../components';

function renderToolBarActions() {
  return [
    <KuiButton
      key="add"
      buttonType="primary"
      aria-label="Add"
    >
      Add
    </KuiButton>,
    <KuiButton
      key="settings"
      aria-label="Settings"
      buttonType="basic"
      icon={<KuiButtonIcon type="settings"/>}
    />,
    <KuiButton
      key="menu"
      aria-label="Menu"
      buttonType="basic"
      icon={<KuiButtonIcon type="menu"/>}
    />
  ];
}

function renderPager() {
  return (
    <KuiPager
      startNumber={1}
      hasNextPage={true}
      hasPreviousPage={false}
      endNumber={10}
      totalItems={100}
      onNextPage={() => {
      }}
      onPreviousPage={() => {
      }}
    />
  );
}

function renderColumns() {
  return [
    <KuiTableHeaderCell key="title">
      Title
    </KuiTableHeaderCell>,
    <KuiTableHeaderCell key="status">
      Status
    </KuiTableHeaderCell>,
    <KuiTableHeaderCell key="created">
      Date created
    </KuiTableHeaderCell>,
    <KuiTableHeaderCell
      key="order"
      className="kuiTableHeaderCell--alignRight"
    >
      Orders of magnitude
    </KuiTableHeaderCell>
  ];
}

export function ListingTableWithNoItems() {
  return (
    <KuiListingTable
      pager={renderPager()}
      toolBarActions={renderToolBarActions()}
      columns={renderColumns()}
      onFilter={() => {}}
      filter="hello"
      prompt={<KuiListingTableNoMatchesPrompt />}
      onItemSelectionChanged={() => {}}
    />
  );
}
