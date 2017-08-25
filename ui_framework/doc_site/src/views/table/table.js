import React, {
  Component,
} from 'react';

import classNames from 'classnames';

import {
  KuiTable,
  KuiTableBody,
  KuiTableHeader,
  KuiTableHeaderCell,
  KuiTableHeaderCheckBoxCell,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableRowCheckBoxCell,
} from '../../../../components';

import {
  SortableProperties,
} from '../../../../services';

const statusToIconClassNameMap = {
  success: 'kuiIcon--success fa-check',
  warning: 'kuiIcon--warning fa-bolt',
  danger: 'kuiIcon--error fa-warning',
};

export class Table extends Component {
  constructor(props) {
    super(props);

    this.state = {
      sortedColumn: 'title',
      rowToSelectedStateMap: new Map(),
    };

    this.items = [{
      title: 'Alligator',
      isLink: true,
      status: 'success',
      dateCreated: 'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
      dateModified: 'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
    }, {
      title: 'Boomerang',
      isLink: false,
      status: 'success',
      dateCreated: 'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
      dateModified: 'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
      details: 'All kinds of crazy information about boomerangs could go in here.',
    }, {
      title: 'Celebration of some very long content that will affect cell width and should eventually become truncated',
      isLink: true,
      status: 'warning',
      dateCreated: 'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
      dateModified: 'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
    }, {
      title: 'You can also specify that really long content wraps instead of becoming truncated with an ellipsis (which is the default behavior)', // eslint-disable-line max-len
      isLink: true,
      isWrapped: true,
      status: 'danger',
      dateCreated: 'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
      dateModified: 'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
    }];

    this.sortableProperties = new SortableProperties([{
      name: 'title',
      getValue: item => item.title.toLowerCase(),
      isAscending: true,
    }, {
      name: 'status',
      getValue: item => item.status.toLowerCase(),
      isAscending: true,
    }], this.state.sortedColumn);
  }

  onSort = prop => {
    this.sortableProperties.sortOn(prop);

    this.setState({
      sortedColumn: prop,
    });
  }

  toggleItem = item => {
    this.setState(previousState => {
      const rowToSelectedStateMap = new Map(previousState.rowToSelectedStateMap);
      rowToSelectedStateMap.set(item, !rowToSelectedStateMap.get(item));
      return { rowToSelectedStateMap };
    });
  };

  isItemChecked = item => {
    return this.state.rowToSelectedStateMap.get(item);
  };

  renderStatusIcon(status) {
    const iconClasses = classNames('kuiIcon', statusToIconClassNameMap[status]);
    return <div className={iconClasses} />;
  }

  renderRows() {
    const rows = [];

    this.items.forEach(item => {
      const classes = classNames({
        'kuiTableRowCell--wrap': item.isWrapped,
      });

      let title;

      if (item.isLink) {
        title = <a href="">{item.title}</a>;
      } else {
        title = item.title;
      }

      rows.push(
        <KuiTableRow key={item.title}>
          <KuiTableRowCheckBoxCell
            isChecked={this.isItemChecked(item)}
            onChange={() => this.toggleItem(item)}
          />

          <KuiTableRowCell className={classes}>
            {title}
          </KuiTableRowCell>

          <KuiTableRowCell>
            {this.renderStatusIcon(item.status)}
          </KuiTableRowCell>

          <KuiTableRowCell>
            {item.dateCreated}
          </KuiTableRowCell>

          <KuiTableRowCell>
            {item.dateModified}
          </KuiTableRowCell>
        </KuiTableRow>
      );

      if (item.details) {
        rows.push(
          <KuiTableRow key={`${item.title}Details`}>
            <KuiTableRowCell className="kuiTableRowCell--expanded" colSpan="5">
              <h3 className="kuiSubTitle">
                {item.title}
              </h3>
              <p className="kuiText">
                {item.details}
              </p>
            </KuiTableRowCell>
          </KuiTableRow>
        );
      }
    });

    return rows;
  }

  render() {
    return (
      <KuiTable>
        <KuiTableHeader>
          <KuiTableHeaderCheckBoxCell
            isChecked={this.isItemChecked('header')}
            onChange={() => this.toggleItem('header')}
          />

          <KuiTableHeaderCell
            onSort={this.onSort.bind(this, 'title')}
            isSorted={this.state.sortedColumn === 'title'}
            isSortAscending={this.sortableProperties.isAscendingByName('title')}
          >
            Title
          </KuiTableHeaderCell>

          <KuiTableHeaderCell
            onSort={this.onSort.bind(this, 'status')}
            isSorted={this.state.sortedColumn === 'status'}
            isSortAscending={this.sortableProperties.isAscendingByName('status')}
          >
            Status
          </KuiTableHeaderCell>

          <KuiTableHeaderCell>
            Date created
          </KuiTableHeaderCell>

          <KuiTableHeaderCell>
            Date last modified
          </KuiTableHeaderCell>
        </KuiTableHeader>

        <KuiTableBody>
          {this.renderRows()}
        </KuiTableBody>
      </KuiTable>
    );
  }
}
