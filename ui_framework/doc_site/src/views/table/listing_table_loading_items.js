import React from 'react';

import {
  KuiButton,
  KuiButtonIcon,
  KuiPager,
  KuiListingTable,
  KuiListingTableLoadingPrompt,
} from '../../../../components';

import {
  RIGHT_ALIGNMENT
} from '../../../../src/services';

function renderHeader() {
  return [
    'Title',
    'Status',
    'Date created',
    {
      content: 'Orders of magnitude',
      align: RIGHT_ALIGNMENT
    }
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
      onNextPage={() => {}}
      onPreviousPage={() => {}}
    />
  );
}

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
      icon={<KuiButtonIcon type="settings" />}
    />,
    <KuiButton
      key="menu"
      aria-label="Menu"
      buttonType="basic"
      icon={<KuiButtonIcon type="menu" />}
    />
  ];
}

export function ListingTableLoadingItems() {
  return (
    <KuiListingTable
      pager={renderPager()}
      toolBarActions={renderToolBarActions()}
      header={renderHeader()}
      onFilter={() => {}}
      filter=""
      prompt={<KuiListingTableLoadingPrompt />}
      onItemSelectionChanged={() => {}}
    />
  );
}
