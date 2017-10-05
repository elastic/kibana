import React from 'react';

import {
  KuiButton,
  KuiButtonIcon,
  KuiPager,
  KuiTableRowCell,
  KuiTableHeaderCell,
  KuiListingTable,
} from '../../../../components';

import {
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT
} from '../../../../services';

function wrapInRowCell(cell, key, alignment = LEFT_ALIGNMENT) {
  return (
    <KuiTableRowCell align={alignment} key={key}>
      {cell}
    </KuiTableRowCell>
  );
}

export class ListingTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedRowIds: [],
    };

    this.rows = [
      {
        id: '1',
        cells: [
          wrapInRowCell(<a className="kuiLink" href="#">Alligator</a>, 'title1'),
          wrapInRowCell(<div className="kuiIcon kuiIcon--success fa-check"/>, 'status1'),
          wrapInRowCell('Tue Dec 06 2016 12:56:15 GMT-0800 (PST)', 'time1'),
          wrapInRowCell('1', 'order1', RIGHT_ALIGNMENT)
        ]
      },
      {
        id: '2',
        cells: [
          wrapInRowCell(<a className="kuiLink" href="#">Boomerang</a>, 'title2'),
          wrapInRowCell(<div className="kuiIcon kuiIcon--success fa-check"/>, 'status2'),
          wrapInRowCell('Tue Dec 06 2016 12:56:15 GMT-0800 (PST)', 'time2'),
          wrapInRowCell('10', 'order2', RIGHT_ALIGNMENT),
        ]
      },
      {
        id: '3',
        cells: [
          wrapInRowCell(<a className="kuiLink" href="#">Celebration</a>, 'title3'),
          wrapInRowCell(<div className="kuiIcon kuiIcon--warning fa-bolt"/>, 'status3'),
          wrapInRowCell('Tue Dec 06 2016 12:56:15 GMT-0800 (PST)', 'time3'),
          wrapInRowCell('100', 'order3', RIGHT_ALIGNMENT)
        ]
      },
      {
        id: '4',
        cells: [
          wrapInRowCell(<a className="kuiLink" href="#">Dog</a>, 'title4'),
          wrapInRowCell(<div className="kuiIcon kuiIcon--error fa-warning"/>, 'status4'),
          wrapInRowCell('Tue Dec 06 2016 12:56:15 GMT-0800 (PST)', 'time4'),
          wrapInRowCell('1000', 'order4', RIGHT_ALIGNMENT)
        ]
      }
    ];
  }

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

  renderToolBarActions() {
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

  renderColumns() {
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

  onItemSelectionChanged = (selectedRowIds) => {
    this.setState({ selectedRowIds });
  };

  render() {
    return (
      <KuiListingTable
        pager={this.renderPager()}
        toolBarActions={this.renderToolBarActions()}
        selectedRowIds={this.state.selectedRowIds}
        rows={this.rows}
        columns={this.renderColumns()}
        onFilter={() => {}}
        filter=""
        onItemSelectionChanged={this.onItemSelectionChanged}
      />
    );
  }
}
