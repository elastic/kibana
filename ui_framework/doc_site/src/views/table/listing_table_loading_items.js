import React from 'react';

import {
  KuiButton,
  KuiButtonIcon,
  KuiPager,
  KuiListingTable,
  KuiTableHeaderCell,
} from '../../../../components';

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

export class ListingTableLoadingItems extends React.Component {
  renderPager() {
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

  renderToolbarActions() {
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
        icon={<KuiButtonIcon type="settings" />}
      />,
      <KuiButton
        aria-label="Menu"
        buttonType="basic"
        icon={<KuiButtonIcon type="menu" />}
      />
    ];
  }

  render() {
    return (
      <KuiListingTable
        pager={this.renderPager()}
        toolbarActions={this.renderToolbarActions()}
        selectedRowIds={[]}
        rows={[]}
        columns={renderColumns()}
        onFilter={() => {}}
        filter=""
        loading={true}
        onItemSelectionChanged={() => {}}
      />
    );
  }
}
