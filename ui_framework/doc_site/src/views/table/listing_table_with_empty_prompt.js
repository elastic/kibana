import React from 'react';

import {
  KuiButton,
  KuiButtonIcon,
  KuiPager,
  KuiEmptyTablePrompt,
  KuiEmptyTablePromptPanel,
  KuiListingTable,
  KuiTableHeaderCell
} from '../../../../components';

function renderEmptyTablePrompt() {
  return (
    <KuiEmptyTablePromptPanel>
      <KuiEmptyTablePrompt
        actions={<KuiButton buttonType="primary">Add Items</KuiButton>}
        message="Uh oh you have no items!"
      />
    </KuiEmptyTablePromptPanel>
  );
}

function renderToolBarActions() {
  return [
    <KuiButton
      buttonType="primary"
      aria-label="Add"
    >
      Add
    </KuiButton>,
    <KuiButton
      aria-label="Settings"
      buttonType="basic"
      icon={<KuiButtonIcon type="settings"/>}
    />,
    <KuiButton
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

export function ListingTableWithEmptyPrompt() {
  return (
    <KuiListingTable
      pager={renderPager()}
      toolBarActions={renderToolBarActions()}
      columns={renderColumns()}
      onFilter={() => {}}
      filter=""
      prompt={renderEmptyTablePrompt()}
      onItemSelectionChanged={() => {}}
    />
  );
}
